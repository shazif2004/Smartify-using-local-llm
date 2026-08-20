import ShortAnswerSession, {
  type ShortAnswerQuestion,
  type ShortAnswerResult,
} from "../components/quiz/ShortAnswerSession";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";


import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../services/api";

type QuizQuestion = {
  id: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
};

type Quiz = {
  id: number;
  title: string;
  document_id: number;
  questions: QuizQuestion[];
  short_answer_questions: ShortAnswerQuestion[];
};

type QuizResult = {
  question_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
};

type SubmissionResult = {
  score: number;
  total_questions: number;
  percentage: number;
  results: QuizResult[];
};

function improveMathSpacing(text: string) {
  return text.replaceAll("\\frac", "\\dfrac");
}

function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const quiz = location.state?.quiz as Quiz | undefined;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizStage, setQuizStage] = useState<
  "mcq" | "short_answer" | "complete"
>("mcq");

const [shortAnswerResults, setShortAnswerResults] =
  useState<ShortAnswerResult[]>([]);

  if (!quiz) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] p-10">
        <p className="text-lg text-[#52665f]">
          Quiz not found.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-5 rounded-xl bg-[#173f35] px-5 py-3 font-semibold text-white"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  const activeQuiz = quiz;
  const currentQuestion =
    activeQuiz.questions[currentQuestionIndex];

  const choices = [
    ["A", currentQuestion.choice_a],
    ["B", currentQuestion.choice_b],
    ["C", currentQuestion.choice_c],
    ["D", currentQuestion.choice_d],
  ];

  const selectedAnswer = answers[currentQuestion.id];

  const questionResult = result?.results.find(
    (item) => item.question_id === currentQuestion.id
  );

  function selectAnswer(answer: string) {
    if (result) return;

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: answer,
    }));
  }

  async function handleSubmit() {
    if (
      Object.keys(answers).length !==
      activeQuiz.questions.length
    ) {
      alert("Please answer every question.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        `/quizzes/${activeQuiz.id}/submit`,
        {
          answers: activeQuiz.questions.map((question) => ({
            question_id: question.id,
            selected_answer: answers[question.id],
          })),
        }
      );

      setResult(response.data);
setCurrentQuestionIndex(0);

if (
  activeQuiz.short_answer_questions.length > 0
) {
  setQuizStage("short_answer");
} else {
  setQuizStage("complete");
}
    } catch (error) {
      console.error(error);
      alert("Could not submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (
      currentQuestionIndex <
      activeQuiz.questions.length - 1
    ) {
      setCurrentQuestionIndex(
        (current) => current + 1
      );
    }
  }

  function goPrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(
        (current) => current - 1
      );
    }
  }

  if (quizStage === "short_answer") {
  return (
    <main className="min-h-screen bg-[#f8f5ed] px-6 py-10">
      <div className="mx-auto max-w-3xl">

        <button
          onClick={() =>
            navigate(
              `/study/${activeQuiz.document_id}`
            )
          }
          className="text-sm font-medium text-[#52665f]"
        >
          ← Back to material
        </button>

        <div className="mt-8">
          <ShortAnswerSession
            quizId={activeQuiz.id}
            questions={activeQuiz.short_answer_questions}
            onFinish={(results) => {
              setShortAnswerResults(results);
              setQuizStage("complete");
            }}
          />
        </div>

      </div>
    </main>
  );
}


  return (
    <main className="min-h-screen bg-[#f8f5ed] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() =>
            navigate(
              `/study/${activeQuiz.document_id}`
            )
          }
          className="text-sm font-medium text-[#52665f]"
        >
          ← Back to material
        </button>

        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm font-medium text-[#52665f]">
            Multiple choice · {currentQuestionIndex + 1} of{" "}
            {activeQuiz.questions.length}
          </p>

          <div className="flex gap-2">
            {activeQuiz.questions.map((question, index) => (
              <span
                key={question.id}
                className={`h-2.5 rounded-full ${
                  index === currentQuestionIndex
                    ? "w-7 bg-[#173f35]"
                    : index < currentQuestionIndex
                    ? "w-2.5 bg-[#8da097]"
                    : "w-2.5 bg-[#e4e1d8]"
                }`}
              />
            ))}
          </div>
        </div>

        <section className="mt-7 rounded-3xl border border-[#ddd8cb] bg-white p-8 shadow-sm">
          <div className="font-serif text-3xl font-bold leading-tight text-[#172c26]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <>{children}</>,
              }}
            >
              {improveMathSpacing(currentQuestion.question)}
            </ReactMarkdown>
          </div>

          <div className="mt-7 space-y-3">
            {choices.map(([letter, text]) => {
              const isSelected =
                selectedAnswer === letter;

              const isCorrect =
                questionResult?.correct_answer === letter;

              const isWrongSelected =
                Boolean(questionResult) &&
                isSelected &&
                !questionResult?.is_correct;

              return (
                <button
                  key={letter}
                  onClick={() =>
                    selectAnswer(letter)
                  }
                  disabled={Boolean(result)}
                  className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                    isCorrect && result
                      ? "border-[#2f6655] bg-[#edf4f0]"
                      : isWrongSelected
                      ? "border-[#e65245] bg-[#fff0ed]"
                      : isSelected
                      ? "border-[#173f35] bg-[#eef2ef]"
                      : "border-[#e2ddd2] bg-white hover:border-[#aab5b0]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isCorrect && result
                        ? "bg-[#173f35] text-white"
                        : isWrongSelected
                        ? "bg-[#dd3c2f] text-white"
                        : "bg-[#edf0ed] text-[#7c8984]"
                    }`}
                  >
                    {isCorrect && result
                      ? "✓"
                      : isWrongSelected
                      ? "×"
                      : letter}
                  </span>

                  <div className="min-w-0 text-base leading-8 text-[#37443f]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => <>{children}</>,
                      }}
                    >
                      {improveMathSpacing(text)}
                    </ReactMarkdown>
                  </div>
                </button>
              );
            })}
          </div>

          {questionResult && (
            <div className="mt-5 rounded-2xl bg-[#f5f2eb] p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f6655]">
                {questionResult.is_correct
                  ? "Correct"
                  : "Explanation"}
              </p>

              <div className="mt-2 leading-7 text-[#43504b]">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      p: ({ children }) => (
        <p className="mb-3 last:mb-0">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold text-[#172c26]">
          {children}
        </strong>
      ),
      li: ({ children }) => (
        <li className="ml-5 list-disc marker:text-[#d98a28]">
          {children}
        </li>
      ),
    }}
  >
    {improveMathSpacing(questionResult.explanation)}
  </ReactMarkdown>
</div>
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goPrevious}
            disabled={currentQuestionIndex === 0}
            className="rounded-xl px-5 py-3 font-medium text-[#52665f] disabled:opacity-30"
          >
            ← Previous
          </button>

          {!result &&
          currentQuestionIndex ===
            activeQuiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : "Submit Quiz"}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={
                currentQuestionIndex ===
                activeQuiz.questions.length - 1
              }
              className="rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white disabled:opacity-30"
            >
              Next →
            </button>
          )}
        </div>

        {result &&
          quizStage === "complete" && (
            <section className="mt-10 rounded-3xl border border-[#ddd8cb] bg-white p-7 text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#d98a28]">
                Final score
              </p>

              <p className="mt-3 font-serif text-6xl font-bold text-[#173f35]">
                {result.percentage.toFixed(0)}%
              </p>

              <p className="mt-2 text-[#68736f]">
                {result.score} out of{" "}
                {result.total_questions} correct
              </p>
            </section>
          )}

        {quizStage === "complete" &&
          shortAnswerResults.length > 0 && (
            <section className="mt-8">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#d98a28]">
                  Short Answer Review
                </p>

                <h2 className="mt-2 font-serif text-3xl font-bold text-[#172c26]">
                  Compare your answers
                </h2>

                <p className="mt-2 text-[#68736f]">
                  Review what you wrote against the expected answer.
                </p>
              </div>

              <div className="space-y-6">
                {shortAnswerResults.map((item, index) => (
                  <article
                    key={item.question_id}
                    className="rounded-3xl border border-[#ddd8cb] bg-white p-7 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#2f6655]">
                        Question {index + 1}
                      </p>

                      <span className="rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-semibold text-[#2f6655]">
                        {item.topic}
                      </span>
                    </div>

                    <h3 className="mt-4 font-serif text-2xl font-bold leading-tight text-[#172c26]">
                      {item.question}
                    </h3>

                    <div className="mt-6 rounded-2xl border border-[#e1ddd4] bg-[#fbfaf7] p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#7b8782]">
                        Your Answer
                      </p>

                      <p className="mt-2 whitespace-pre-wrap leading-7 text-[#37443f]">
                        {item.student_answer}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#cdded6] bg-[#edf4f0] p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2f6655]">
                        Expected Answer
                      </p>

                      <div className="mt-2 leading-7 text-[#37443f]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-[#172c26]">
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-4 ml-6 list-disc space-y-2">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-4 ml-6 list-decimal space-y-2">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-7">
                                {children}
                              </li>
                            ),
                          }}
                        >
                          {improveMathSpacing(item.expected_answer)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white"
                >
                  Back to dashboard
                </button>
              </div>
            </section>
          )}
      </div>
    </main>
  );
}

export default QuizPage;