import re
from dataclasses import dataclass
from typing import Any


MAX_CHUNK_CHARACTERS = 3500
MIN_CHUNK_WORDS = 3


@dataclass
class ConceptChunk:
    page_number: int
    chunk_index: int
    title: str | None
    content: str
    word_count: int
    char_count: int


@dataclass
class TextSection:
    title: str | None
    content: str


def normalize_pdf_text(text: str) -> str:
    """
    Clean text extracted from a PDF while preserving useful
    line and paragraph boundaries.
    """
    if not text:
        return ""

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Join words broken across lines by PDF extraction.
    # Example: "neural-\nnetwork" becomes "neuralnetwork".
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Remove spaces before punctuation.
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)

    # Remove repeated spaces and tabs without removing newlines.
    text = re.sub(r"[ \t]+", " ", text)

    # Convert three or more blank lines into two.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def clean_heading(line: str) -> str:
    """
    Remove Markdown symbols and numbering from a heading.

    Examples:
        '# Supervised Learning' -> 'Supervised Learning'
        '2.3 Neural Networks' -> 'Neural Networks'
        '4) Gradient Descent' -> 'Gradient Descent'
    """
    heading = line.strip()

    heading = re.sub(r"^#+\s*", "", heading)

    heading = re.sub(
        r"^\d+(?:\.\d+)*[.)]?\s+",
        "",
        heading,
    )

    return heading.strip().rstrip(":")


def looks_like_equation(line: str) -> bool:
    """
    Return True when a line looks more like mathematical content than a title.
    """
    math_symbols = "=+*/∑∏∫√≤≥≈→←^_{}[]\\"
    symbol_count = sum(character in math_symbols for character in line)
    digit_count = sum(character.isdigit() for character in line)
    letter_count = sum(character.isalpha() for character in line)

    if "=" in line:
        return True

    if symbol_count >= 2:
        return True

    if digit_count > letter_count and digit_count >= 3:
        return True

    return False


def is_heading(
    line: str,
    *,
    blank_before: bool = False,
    blank_after: bool = False,
    previous_text_line: str | None = None,
) -> bool:
    """
    Determine whether a line is likely to be a real section heading.
    """
    line = line.strip()

    if not line:
        return False

    if len(line) > 100:
        return False

    words = line.split()

    if not words or len(words) > 12:
        return False

    first_letter = next(
        (character for character in line if character.isalpha()),
        None,
    )

    if first_letter and first_letter.islower():
        return False

    if looks_like_equation(line):
        return False

    if line.endswith((".", "!", "?", ",", ";")):
        return False

    if (
        previous_text_line
        and not blank_before
        and not previous_text_line.rstrip().endswith(
            (".", "!", "?", ":", ";")
        )
    ):
        return False

    if line.startswith("#"):
        return True

    if re.match(r"^\d+(?:\.\d+)*[.)]?\s+[A-Z]", line):
        return True

    if line.endswith(":") and len(words) <= 8:
        return True

    letters = [character for character in line if character.isalpha()]

    if letters:
        uppercase_ratio = sum(
            character.isupper() for character in letters
        ) / len(letters)

        if uppercase_ratio >= 0.8 and (blank_before or blank_after):
            return True

    significant_words = [
        word
        for word in words
        if word.lower()
        not in {
            "a", "an", "and", "as", "at", "but", "by", "for",
            "from", "in", "of", "on", "or", "the", "to", "with",
        }
    ]

    if not significant_words:
        return False

    title_case_words = sum(
        word[0].isupper()
        for word in significant_words
        if word and word[0].isalpha()
    )

    title_case_ratio = title_case_words / len(significant_words)

    return (
        title_case_ratio >= 0.8
        and len(words) <= 10
        and (blank_before or blank_after)
    )


def join_wrapped_lines(lines: list[str]) -> str:
    """
    Join PDF line wraps into normal prose while preserving paragraph breaks.
    """
    paragraphs: list[str] = []
    current_paragraph: list[str] = []

    def save_paragraph() -> None:
        nonlocal current_paragraph

        paragraph = " ".join(current_paragraph).strip()

        if paragraph:
            paragraphs.append(paragraph)

        current_paragraph = []

    for line in lines:
        if not line:
            save_paragraph()
            continue

        current_paragraph.append(line.strip())

    save_paragraph()

    return "\n\n".join(paragraphs)


def extract_sections(text: str) -> list[TextSection]:
    """
    Divide normalized text into sections using conservative heading detection.
    """
    normalized = normalize_pdf_text(text)

    if not normalized:
        return []

    raw_lines = normalized.splitlines()
    sections: list[TextSection] = []

    current_title: str | None = None
    current_body_lines: list[str] = []
    previous_text_line: str | None = None

    def save_current_section() -> None:
        nonlocal current_body_lines

        content = join_wrapped_lines(current_body_lines).strip()

        if content:
            sections.append(
                TextSection(
                    title=current_title,
                    content=content,
                )
            )

        current_body_lines = []

    for index, raw_line in enumerate(raw_lines):
        line = raw_line.strip()

        if not line:
            if current_body_lines and current_body_lines[-1] != "":
                current_body_lines.append("")
            continue

        blank_before = index == 0 or not raw_lines[index - 1].strip()
        blank_after = (
            index == len(raw_lines) - 1
            or not raw_lines[index + 1].strip()
        )

        if is_heading(
            line,
            blank_before=blank_before,
            blank_after=blank_after,
            previous_text_line=previous_text_line,
        ):
            save_current_section()
            current_title = clean_heading(line)
        else:
            current_body_lines.append(line)

        previous_text_line = line

    save_current_section()

    if not sections and normalized:
        sections.append(
            TextSection(
                title=None,
                content=join_wrapped_lines(raw_lines),
            )
        )

    return sections

def split_into_paragraphs(text: str) -> list[str]:
    """
    Split text using blank lines as paragraph boundaries.
    """
    paragraphs = re.split(r"\n\s*\n", text)

    return [
        paragraph.strip()
        for paragraph in paragraphs
        if paragraph.strip()
    ]


def split_into_sentences(text: str) -> list[str]:
    """
    Split text into sentences using basic punctuation rules.
    """
    sentences = re.split(
        r"(?<=[.!?])\s+(?=[A-Z0-9])",
        text.strip(),
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


def split_large_sentence(
    sentence: str,
    max_characters: int,
) -> list[str]:
    """
    Split an unusually large sentence into fixed-size pieces.
    This is used only as a final fallback.
    """
    return [
        sentence[index : index + max_characters].strip()
        for index in range(0, len(sentence), max_characters)
        if sentence[index : index + max_characters].strip()
    ]


def split_large_paragraph(
    paragraph: str,
    max_characters: int,
) -> list[str]:
    """
    Split an oversized paragraph at sentence boundaries.
    """
    sentences = split_into_sentences(paragraph)

    if not sentences:
        return split_large_sentence(
            sentence=paragraph,
            max_characters=max_characters,
        )

    chunks: list[str] = []
    current_sentences: list[str] = []
    current_length = 0

    def save_current_chunk() -> None:
        nonlocal current_sentences, current_length

        combined = " ".join(current_sentences).strip()

        if combined:
            chunks.append(combined)

        current_sentences = []
        current_length = 0

    for sentence in sentences:
        sentence_length = len(sentence)

        if sentence_length > max_characters:
            save_current_chunk()

            chunks.extend(
                split_large_sentence(
                    sentence=sentence,
                    max_characters=max_characters,
                )
            )

            continue

        additional_length = sentence_length

        if current_sentences:
            additional_length += 1

        if (
            current_sentences
            and current_length + additional_length > max_characters
        ):
            save_current_chunk()

        current_sentences.append(sentence)
        current_length += additional_length

    save_current_chunk()

    return chunks


def split_section_content(
    content: str,
    max_characters: int = MAX_CHUNK_CHARACTERS,
) -> list[str]:
    """
    Split a section into chunks while preserving paragraph and
    sentence boundaries whenever possible.
    """
    cleaned_content = content.strip()

    if not cleaned_content:
        return []

    if len(cleaned_content) <= max_characters:
        return [cleaned_content]

    paragraphs = split_into_paragraphs(cleaned_content)

    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def save_current_chunk() -> None:
        nonlocal current_parts, current_length

        combined = "\n\n".join(current_parts).strip()

        if combined:
            chunks.append(combined)

        current_parts = []
        current_length = 0

    for paragraph in paragraphs:
        paragraph_length = len(paragraph)

        if paragraph_length > max_characters:
            save_current_chunk()

            chunks.extend(
                split_large_paragraph(
                    paragraph=paragraph,
                    max_characters=max_characters,
                )
            )

            continue

        additional_length = paragraph_length

        if current_parts:
            additional_length += 2

        if (
            current_parts
            and current_length + additional_length > max_characters
        ):
            save_current_chunk()

        current_parts.append(paragraph)
        current_length += additional_length

    save_current_chunk()

    return chunks


def create_concept_chunks(
    page_text: str,
    page_number: int,
    starting_chunk_index: int = 0,
    max_characters: int = MAX_CHUNK_CHARACTERS,
) -> list[ConceptChunk]:
    """
    Convert one PDF page into structure-aware concept chunks.
    """
    if page_number < 1:
        raise ValueError("page_number must be 1 or greater.")

    if starting_chunk_index < 0:
        raise ValueError(
            "starting_chunk_index cannot be negative."
        )

    if max_characters <= 0:
        raise ValueError(
            "max_characters must be greater than zero."
        )

    sections = extract_sections(page_text)

    chunks: list[ConceptChunk] = []
    chunk_index = starting_chunk_index

    for section in sections:
        section_parts = split_section_content(
            content=section.content,
            max_characters=max_characters,
        )

        for part_number, part in enumerate(section_parts, start=1):
            cleaned_part = part.strip()

            if not cleaned_part:
                continue

            # Ignore extremely small text fragments such as page numbers.
            if len(cleaned_part.split()) < MIN_CHUNK_WORDS:
                continue

            title = section.title

            if title and len(section_parts) > 1:
                title = f"{title} — Part {part_number}"

            chunks.append(
                ConceptChunk(
                    page_number=page_number,
                    chunk_index=chunk_index,
                    title=title,
                    content=cleaned_part,
                    word_count=len(cleaned_part.split()),
                    char_count=len(cleaned_part),
                )
            )

            chunk_index += 1

    return chunks


def create_pdf_concept_chunks(
    pages: list[dict[str, Any]],
    max_characters: int = MAX_CHUNK_CHARACTERS,
) -> list[ConceptChunk]:
    """
    Convert all extracted PDF pages into concept-aware chunks.

    Expected page format:

    {
        "page_number": 1,
        "text": "Extracted page text"
    }
    """
    if max_characters <= 0:
        raise ValueError(
            "max_characters must be greater than zero."
        )

    all_chunks: list[ConceptChunk] = []
    next_chunk_index = 0

    for page in pages:
        page_number = page.get("page_number")
        page_text = page.get("text", "")

        if not isinstance(page_number, int):
            raise ValueError(
                "Every page must contain an integer page_number."
            )

        if not isinstance(page_text, str):
            raise ValueError(
                f"Page {page_number} must contain text as a string."
            )

        page_chunks = create_concept_chunks(
            page_text=page_text,
            page_number=page_number,
            starting_chunk_index=next_chunk_index,
            max_characters=max_characters,
        )

        all_chunks.extend(page_chunks)
        next_chunk_index += len(page_chunks)

    return all_chunks