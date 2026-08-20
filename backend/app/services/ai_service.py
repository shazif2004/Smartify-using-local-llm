from __future__ import annotations

import json
import logging
import time
from collections import Counter
from typing import Optional

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.focus import FocusBreakdown
from app.schemas.quiz import GeneratedQuiz

from openai import OpenAI

logger = logging.getLogger(__name__)

client = OpenAI(
    # Ollama ignores the key, but the OpenAI client requires a non-empty one.
    api_key="ollama-local",
    base_url=settings.OLLAMA_BASE_URL,
    timeout=600.0,
)

EXPLANATION_MODEL = settings.EXPLANATION_MODEL
QUIZ_MODEL = settings.QUIZ_MODEL
# --- Tunable limits -----------------------------------------------------

# Character budgets for source material. These are conservative
# character-based proxies for the model's token window; we truncate on a
# word boundary so we never hand the model a chopped-off sentence.
EXPLANATION_CHAR_LIMIT = 8_000
QUIZ_CHAR_LIMIT = 16_000
FOCUS_CHAR_LIMIT = 16_000

# Retry behavior for transient API failures (network hiccups, 5xx, etc.)
MAX_API_RETRIES = 5
API_RETRY_BACKOFF_SECONDS = 1.5

# Retry behavior specifically for "the model answered but broke the
# contract" cases (bad JSON, wrong question count, schema mismatch).
MAX_CONTRACT_RETRIES = 3


class GenerationError(RuntimeError):
    """Raised when the model provider could not be reached or returned nothing."""


class ContractViolationError(RuntimeError):
    """Raised when the model responded, but the response didn't satisfy the
    structural contract we asked for (bad JSON, wrong count, etc.), even
    after repair attempts."""


# --- Shared helpers -------------------------------------------------------


def _truncate_on_word_boundary(text: str, limit: int) -> tuple[str, bool]:
    """Truncate `text` to at most `limit` characters without cutting a
    word in half. Returns (truncated_text, was_truncated)."""
    if len(text) <= limit:
        return text, False

    cut = text[:limit]
    last_space = cut.rfind(" ")
    if last_space > 0:
        cut = cut[:last_space]
    return cut.rstrip() + " …", True


def _call_model_with_retries(
    *,
    model: str,
    contents: str,
    system_instruction: str,
    temperature: float,
    max_output_tokens: int,
    response_format: Optional[dict] = None,
) -> str:
    """Call the local Ollama model and retry transient failures."""
    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_API_RETRIES + 1):
        try:
            request_kwargs = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": system_instruction,
                    },
                    {
                        "role": "user",
                        "content": contents,
                    },
                ],
                "temperature": temperature,
                "max_tokens": max_output_tokens,
                # gemma4:26b otherwise spends the output budget in a separate
                # reasoning field before producing visible answer text.
                "reasoning_effort": "none",
            }

            if response_format is not None:
                request_kwargs["response_format"] = response_format

            response = client.chat.completions.create(**request_kwargs)

            finish_reason = response.choices[0].finish_reason
            usage = response.usage

            logger.info(
                "Ollama response model=%s finish_reason=%s usage=%s",
                model,
                finish_reason,
                usage,
            )

            text = response.choices[0].message.content

            if text:
                if finish_reason == "length":
                    logger.warning(
                        "Ollama response hit the output-token limit "
                        "(attempt %s/%s)",
                        attempt,
                        MAX_API_RETRIES,
                    )
                return text

            logger.warning(
                "Ollama returned an empty response (attempt %s/%s)",
                attempt,
                MAX_API_RETRIES,
            )
            last_error = GenerationError(
                "Ollama returned an empty response"
            )

        except Exception as error:
            logger.warning(
                "Ollama call failed (attempt %s/%s): %s",
                attempt,
                MAX_API_RETRIES,
                error,
            )
            last_error = error

        if attempt < MAX_API_RETRIES:
            time.sleep(API_RETRY_BACKOFF_SECONDS * attempt)

    raise GenerationError(
        f"The local Ollama model {model!r} could not be reached after "
        f"{MAX_API_RETRIES} attempts"
    ) from last_error


# --- Explanations ---------------------------------------------------------


def _normalize_explanation_mode(mode: str) -> str:
    normalized = (mode or "").strip().lower()

    aliases = {
    "eli10": "eli10",
    "explain_like_im_10": "eli10",
    "explain like i'm 10": "eli10",
    "explain like im 10": "eli10",
    "explain like i am 10": "eli10",

    "college": "college",
    "college_level": "college",
    "college level": "college",

    "simpleenglish": "simpleenglish",
    "simple_english": "simpleenglish",
    "simple english": "simpleenglish",

    "summary": "summary",
    "30_second_summary": "summary",
    "30 second summary": "summary",
    "30-second summary": "summary",

    "thirty_second_summary": "summary",
    "thirty second summary": "summary",
    "thirty-second summary": "summary",

    "exam": "exam",
    "exam_review": "exam",
    "exam review": "exam",
}

    compact = (
        normalized.replace("_", "")
                  .replace("-", "")
                  .replace(" ", "")
    )

    compact_aliases = {
        k.replace("_", "").replace("-", "").replace(" ", ""): v
        for k, v in aliases.items()
    }

    return compact_aliases.get(compact, "college")


def _grounding_rules(was_truncated: bool) -> str:
    truncation_rule = (
        "\n- The supplied material was shortened. Do not imply that the "
        "response covers the complete document."
        if was_truncated
        else ""
    )

    return f"""
Grounding and formatting rules:
- Use only the supplied course material.
- Do not invent outside facts, names, statistics, or examples.
- Preserve the meaning of the source.
- Focus on the important ideas instead of restating every line.
- Return clean Markdown.
- Use valid LaTeX only when mathematics is genuinely needed.
- Use `$...$` for inline math and `$$...$$` for display math.{truncation_rule}
""".strip()


def build_explanation_prompt(
    text: str,
    mode: str,
    was_truncated: bool = False,
) -> str:
    mode = _normalize_explanation_mode(mode)
    grounding = _grounding_rules(was_truncated)

    if mode == "eli10":
        instructions = """
You are Smartify.

Your job is to help a curious 10-year-old truly understand difficult ideas.

Do not summarize the notes.

Teach them.

Rules:

Start with one simple analogy.

Use that SAME analogy throughout the explanation.

Do not switch to a new analogy halfway through.

• After the analogy, gradually connect it to the real scientific concept.

• If you introduce a difficult scientific term (such as entropy, event horizon, or semiclassical calculation), immediately explain it in one simple sentence before using it again.

Bad:
"This requires a semiclassical calculation."

Good:
"This requires a semiclassical calculation. That simply means scientists are using one set of rules on top of another because they don't yet have one theory that explains everything."

• Keep all important concepts from the course material.

Do not stop after introducing the main idea.

Continue explaining until every major concept in the supplied material has been covered.

• Do NOT skip important terms. Introduce them in simple language.
  Example:
  "Scientists call this General Relativity. It is the set of rules that explains gravity."

Guide the explanation using natural questions a curious student might ask.

Do NOT write the questions as headings.

Instead, answer them naturally inside the explanation so it reads like a conversation.

• Explain WHY something matters before explaining HOW it works.

Explain one idea at a time.

For every important concept, follow this order:

1. Introduce it.
2. Explain it in simple words.
3. Explain why it matters.
4. Connect it to the next concept.

Never jump to a new concept before finishing the current one.

• Use short paragraphs.

• Use friendly, conversational language.

• Avoid unnecessary jargon, but do not remove important scientific vocabulary.

• Stay grounded in the supplied course material.
  Do not invent new facts or teach topics that are not mentioned.

• Analogies should help understanding, not replace the real explanation.

• End with:

## The Big Idea

Summarize the entire lesson in one or two simple sentences that a 10-year-old could remember.
""".strip()

    elif mode == "college":
        instructions = """
You are an outstanding university professor teaching undergraduate students.

Do not summarize the notes.

Teach the concepts.

Assume the student is intelligent but encountering this material for the first time.

Rules:

• Begin with the central question or problem the topic is trying to solve.

• Explain WHY each concept exists before explaining HOW it works.

• Build ideas step by step so each paragraph naturally follows from the previous one.

• Define every important technical term the first time it appears.

• Connect new concepts to previously explained ones instead of presenting isolated facts.

• Focus on intuition first, then introduce the mathematical or physical interpretation.

• Do not merely paraphrase the supplied material. Expand on the reasoning while remaining grounded in it.

• Use examples or thought experiments when they improve understanding.

• Whenever you introduce a new concept, briefly explain why the reader should care before moving on.

• Do not invent facts beyond the supplied material.

• End with:

## Common Misconception

Describe one common misunderstanding.

Then finish with:

## Key Takeaways

3–5 concise bullet points summarizing the most important ideas.
""".strip()

    elif mode == "simpleenglish":
        instructions = """
Rewrite this for someone with intermediate English.

Keep all important ideas.

Do not remove concepts.

Replace difficult words.

Keep sentences under 18 words.

Explain technical terms immediately.

Do not tell stories.

Do not add examples unless needed.

• Keep all important scientific terms.

• Immediately explain each technical term in one short sentence using simple English.

• Do not replace scientific vocabulary with easier words. Explain it instead.

Write in short, natural paragraphs.

Explain ideas as if you are tutoring an adult who has no background in the subject.

Do not write like a glossary or dictionary.

Connect ideas smoothly so the explanation reads like a conversation rather than a list of definitions.

""".strip()

    elif mode == "summary":
        instructions = """
The student has only 30 seconds to review this topic before moving on.

Your job is to compress the material, not teach it.

Your response MUST:
• Be under 100 words.
• Preserve only the most important ideas.
• Use short, direct sentences.

Return ONLY in this format:

## Central Idea
Write exactly one sentence that captures the main idea.

## Key Points
Write exactly 4 bullet points.
• Each bullet must express only one key idea.
• Each bullet must be 8–12 words.
• Do not define terms.
• Do not explain concepts.
• Do not include examples.

## Remember
Write exactly one memorable sentence highlighting the single most important takeaway.

Rules:
• Do not explain.
• Do not teach.
• Do not define terminology.
• Do not introduce new information.
• Do not include examples.
• Do not include introductions or conclusions.
• Stay completely grounded in the supplied course material.
• If something is not essential, omit it.
""".strip()

    else:
        instructions = """
You are preparing a student for tomorrow's exam.

Output exactly:

## Core Concepts

## Definitions

## Equations

## Common Mistakes

## Memory Tricks

## Likely Exam Questions

Be concise.

Focus only on testable material.

Do not teach.

Do not tell stories.
""".strip()

    return f"""
{instructions}

{grounding}

Course material:

{text}
""".strip()


def generate_explanation(
    section_text: str,
    explanation_mode: str,
) -> str:
    material, was_truncated = _truncate_on_word_boundary(
        section_text,
        EXPLANATION_CHAR_LIMIT,
    )

    if not material:
        raise GenerationError("No course material was provided for explanation")

    normalized_mode = _normalize_explanation_mode(explanation_mode)
    

    logger.info(
        "Generating explanation with requested_mode=%r normalized_mode=%s",
        explanation_mode,
        normalized_mode,
    )

    if was_truncated:
        logger.warning(
            "Explanation source shortened from %s to %s characters",
            len(section_text),
            len(material),
        )

    prompt = build_explanation_prompt(
        material,
        normalized_mode,
        was_truncated,
    )

    text = _call_model_with_retries(
    model=EXPLANATION_MODEL,
    contents=prompt,
    system_instruction=(
        "You are Smartify, an adaptive educational tutor. "
        "Follow the requested explanation mode exactly. "
        "Do not mix explanation styles. "
        "Use only the supplied course material. "
        "Do not invent facts. "
        "Return clean Markdown with valid LaTeX when needed."
    ),
    temperature=0.2 if normalized_mode == "eli10" else 0.1,
    max_output_tokens=2500,
)

    return text.strip()




# --- Quizzes ---------------------------------------------------------------


def generate_quiz(
    document_text: str,
    difficulty: str,
    number_of_questions: int,
) -> GeneratedQuiz:
    material, was_truncated = _truncate_on_word_boundary(
        document_text, QUIZ_CHAR_LIMIT
    )
    if was_truncated:
        logger.warning(
            "Document text truncated from %s to %s characters for quiz "
            "generation; questions will only cover the retained portion.",
            len(document_text),
            QUIZ_CHAR_LIMIT,
        )

    response_format = _quiz_response_format(number_of_questions)
    last_error: Optional[Exception] = None
    repair_note = ""

    for attempt in range(1, MAX_CONTRACT_RETRIES + 1):
        prompt = _build_quiz_prompt(
            material, difficulty, number_of_questions, was_truncated, repair_note
        )

        raw = _call_model_with_retries(
            model=QUIZ_MODEL,
            contents=prompt,
            system_instruction=(
                "You create grounded educational quizzes. "
                "Return valid JSON only. "
                "Use valid LaTeX for mathematical notation and escape "
                "LaTeX backslashes correctly inside JSON strings."
            ),
            temperature=0.2,
            max_output_tokens=5000,
            response_format=response_format,
        )

        try:
            quiz_data = _parse_json_object(raw)
            quiz = GeneratedQuiz.model_validate(quiz_data)
            _validate_quiz_contract(quiz, number_of_questions)
            return quiz

        except json.JSONDecodeError as error:
            logger.warning(
                "Ollama returned invalid JSON on attempt %s/%s: %s",
                attempt,
                MAX_CONTRACT_RETRIES,
                raw[:500],
            )
            last_error = error
            repair_note = (
                "\nIMPORTANT: your previous response was not valid JSON. "
                "Double-check every backslash used in LaTeX is escaped as "
                "\\\\ inside the JSON string, and return ONLY the JSON "
                "object with no surrounding text or code fences.\n"
            )

        except ValidationError as error:
            logger.warning(
                "Ollama JSON did not match the quiz schema on attempt "
                "%s/%s: %s",
                attempt,
                MAX_CONTRACT_RETRIES,
                error,
            )
            last_error = error
            repair_note = (
                "\nIMPORTANT: your previous response did not match the "
                "required schema exactly. Follow the structure below "
                "precisely, with no extra or missing fields.\n"
            )

        except ContractViolationError as error:
            logger.warning(
                "Ollama quiz failed contract validation on attempt %s/%s: %s",
                attempt,
                MAX_CONTRACT_RETRIES,
                error,
            )
            last_error = error
            repair_note = f"\nIMPORTANT: {error}\n"

    raise ContractViolationError(
        f"Ollama failed to produce a valid quiz after {MAX_CONTRACT_RETRIES} "
        "attempts"
    ) from last_error


def _quiz_response_format(number_of_questions: int) -> dict:
    """Build the strict structured-output contract sent to Ollama.

    The item counts are added dynamically because the user can request a
    different number of multiple-choice questions for each quiz.
    """
    schema = GeneratedQuiz.model_json_schema()

    questions_schema = schema["properties"]["questions"]
    questions_schema["minItems"] = number_of_questions
    questions_schema["maxItems"] = number_of_questions

    short_answer_schema = schema["properties"]["short_answer_questions"]
    short_answer_schema["minItems"] = 3
    short_answer_schema["maxItems"] = 3

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "smartify_quiz",
            "strict": True,
            "schema": schema,
        },
    }


def _parse_json_object(raw: str) -> dict:
    """Tolerate a local model wrapping otherwise-valid JSON in a code fence."""
    cleaned = raw.strip()

    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        cleaned = cleaned[first_newline + 1 :] if first_newline >= 0 else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace >= 0 and last_brace > first_brace:
        cleaned = cleaned[first_brace : last_brace + 1]

    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise json.JSONDecodeError("Expected a JSON object", cleaned, 0)
    return parsed


def _validate_quiz_contract(quiz: GeneratedQuiz, number_of_questions: int) -> None:
    """Raise ContractViolationError if the quiz doesn't satisfy structural
    guarantees the schema alone can't enforce."""

    actual_count = len(quiz.questions)
    if actual_count != number_of_questions:
        raise ContractViolationError(
            f"Expected exactly {number_of_questions} questions, got "
            f"{actual_count}. Return exactly {number_of_questions} "
            "questions, no more and no fewer."
        )

    valid_letters = {"A", "B", "C", "D"}
    for q in quiz.questions:
        if q.correct_answer not in valid_letters:
            raise ContractViolationError(
                f'correct_answer must be exactly "A", "B", "C", or "D" '
                f"(got {q.correct_answer!r})."
            )

  
    if actual_count >= 4:
        letters = Counter(q.correct_answer for q in quiz.questions)
        if len(letters) == 1:
            raise ContractViolationError(
                "Every correct_answer used the same letter. Vary the "
                "position of the correct answer across questions."
            )

    short_answer_count = len(quiz.short_answer_questions)

    if short_answer_count != 3:
        raise ContractViolationError(
            "Expected exactly 3 short-answer questions, "
            f"got {short_answer_count}."
        )


def _build_quiz_prompt(
    document_text: str,
    difficulty: str,
    number_of_questions: int,
    was_truncated: bool,
    repair_note: str,
) -> str:
    difficulty_guidance = {
        "easy": (
            "Test core concepts and direct understanding. Keep wording "
            "straightforward, use facts stated clearly in the material, and "
            "avoid trick questions or overly similar choices."
        ),
        "medium": (
            "Test understanding, relationships between ideas, and simple "
            "application. Mix direct recall with questions that require one "
            "clear reasoning step."
        ),
        "hard": (
            "Test synthesis, subtle distinctions, and multi-step reasoning. "
            "Use plausible distractors, but keep every question unambiguous "
            "and fully answerable from the supplied material."
        ),
    }.get(difficulty, "Test balanced understanding and application.")

    truncation_note = (
        "\nNote: the course material below was truncated for length. Only "
        "write questions about material that is actually shown.\n"
        if was_truncated
        else ""
    )

    return rf"""
You are creating a college study quiz.
{repair_note}
Use only the course material provided below.

Return valid JSON only.
Do not include Markdown code fences.
Do not include any text before or after the JSON.

The JSON must follow this exact structure:

{{
  "title": "Quiz title",
  "questions": [
    {{
      "question": "Multiple-choice question",
      "choice_a": "First answer choice",
      "choice_b": "Second answer choice",
      "choice_c": "Third answer choice",
      "choice_d": "Fourth answer choice",
      "correct_answer": "A",
      "explanation": "Short explanation of the correct answer"
    }}
  ],
  "short_answer_questions": [
    {{
      "topic": "Short topic label",
      "question": "Short-answer question",
      "expected_answer": "Concise model answer based only on the material"
    }}
  ]
}}

Multiple-choice requirements:
Create exactly {number_of_questions} multiple-choice questions.
Do not create more or fewer than {number_of_questions} questions.
Difficulty: {difficulty}.
Difficulty guidance: {difficulty_guidance}
Each multiple-choice question must have exactly four choices.
Every question object must include choice_a, choice_b, choice_c, and choice_d.
The correct_answer value must be exactly "A", "B", "C", or "D".
Only one answer choice may be correct.
Vary the correct-answer position across the quiz.
Do not place every correct answer under the same letter.
Include a short explanation for every correct answer.
Do not create questions about information absent from the material.

Short-answer requirements:
Create exactly 3 short-answer questions.
Each short-answer question must test understanding, not simple memorization.
Do not repeat or lightly reword any multiple-choice question.
Prefer prompts such as:
- Explain why...
- Describe how...
- Compare...
- Summarize in your own words...
- What is the relationship between...?

Each short-answer question must:
- Have a short topic label.
- Be answerable in about 2 to 5 sentences.
- Focus on one clear idea.
- Use only information found in the supplied material.
- Include a concise expected_answer for later grading.
- Avoid yes-or-no questions.
- Avoid asking for information absent from the material.

The expected_answer is for backend grading only.
Do not refer to it as a hint or reveal that it will be hidden from the student.

{truncation_note}
Mathematical formatting requirements:
Whenever a question, answer choice, explanation, or expected answer contains
mathematics, write the mathematics using valid LaTeX.

Use single dollar signs for inline mathematics.

Example:
$E = mc^2$

For a longer equation, use double dollar signs.

Example:

$$
S_{{\mathrm{{BH}}}}
=
\frac{{k_B c^3 A}}{{4G\hbar}}
$$

Because the response must be valid JSON, every LaTeX backslash inside a
JSON string must be escaped with another backslash.

For example, a JSON answer choice containing the formula should look like:

"choice_a": "$S_{{\\mathrm{{BH}}}} = \\frac{{k_B c^3 A}}{{4G\\hbar}}$"

Do not write formulas as plain text.

Incorrect:
SBH = (kB c3 A) / (4 G hbar)

Correct LaTeX content:
$S_{{\mathrm{{BH}}}} = \frac{{k_B c^3 A}}{{4G\hbar}}$

Use proper LaTeX commands when appropriate, including:

\pi
\hbar
\Gamma
\zeta
\frac{{a}}{{b}}
\sum
\prod
\sqrt{{x}}
\infty

Use inline math only for short variables or short expressions such as
$x$, $s$, or $\zeta(s)$.

Use display math with $$...$$ for fractions, sums, products, and longer
equations so they have enough vertical spacing.

Course material:

{document_text}
"""


# --- Focus mode -----------------------------------------------------------


def generate_focus_breakdown(document_text: str) -> FocusBreakdown:
    material, was_truncated = _truncate_on_word_boundary(
        document_text,
        FOCUS_CHAR_LIMIT,
    )

    if not material:
        raise GenerationError("No course material was provided for focus mode")

    schema = FocusBreakdown.model_json_schema()
    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "smartify_focus_breakdown",
            "strict": True,
            "schema": schema,
        },
    }

    truncation_note = (
        "The supplied material was shortened. Cover only the material shown."
        if was_truncated
        else "Cover the important concepts across all supplied material."
    )

    prompt = f"""
Turn the course material below into a calm, distraction-free focus session.

Identify the major concepts and arrange them in the best learning order.
Create between 2 and 8 focused concept cards.

For every concept:
- Give it a short, descriptive title.
- Explain it in plain language for a student seeing it for the first time.
- Break difficult ideas into small steps instead of merely summarizing.
- Define technical terms immediately.
- Explain why the concept matters or how it connects to the larger topic.
- Include 2 to 4 concise key points.
- End with one short reflection question under check_your_understanding.

Keep each concept focused on one idea. Use short paragraphs and simple words.
Use only the supplied course material. Do not invent facts or examples.
{truncation_note}

Return JSON matching the required schema only.

Course material:

{material}
""".strip()

    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_CONTRACT_RETRIES + 1):
        raw = _call_model_with_retries(
            model=EXPLANATION_MODEL,
            contents=prompt,
            system_instruction=(
                "You are Smartify's focus tutor. Break course material into "
                "clear, grounded, beginner-friendly concepts. Return only "
                "the requested structured JSON."
            ),
            temperature=0.15,
            max_output_tokens=6000,
            response_format=response_format,
        )

        try:
            return FocusBreakdown.model_validate(_parse_json_object(raw))
        except (json.JSONDecodeError, ValidationError) as error:
            logger.warning(
                "Ollama focus response broke its schema on attempt %s/%s: %s",
                attempt,
                MAX_CONTRACT_RETRIES,
                error,
            )
            last_error = error

    raise ContractViolationError(
        "Ollama could not produce a valid focus breakdown"
    ) from last_error
