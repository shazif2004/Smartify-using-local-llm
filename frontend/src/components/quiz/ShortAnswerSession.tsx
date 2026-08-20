import { useState } from "react";

import api, { getApiErrorDetail } from "../../services/api";


export type ShortAnswerQuestion = {
  id: number;
  topic: string;
  question: string;
};


export type ShortAnswerResult = {
  question_id: number;
  topic: string;
  question: string;
  student_answer: string;
  expected_answer: string;
};


type Props = {
  quizId: number;
  questions: ShortAnswerQuestion[];
  onFinish: (results: ShortAnswerResult[]) => void;
};


function ShortAnswerSession({
  quizId,
  questions,
  onFinish,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<
    Record<number, string>
  >({});

  const [submitting, setSubmitting] = useState(false);


  const currentQuestion = questions[currentIndex];

  const currentAnswer =
    answers[currentQuestion.id] ?? "";


  function updateAnswer(value: string) {
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: value,
    }));
  }


  function goPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (current) => current - 1
      );
    }
  }


  async function submitAnswers() {
    const allAnswered = questions.every(
      (question) =>
        answers[question.id]?.trim()
    );

    if (!allAnswered) {
      alert(
        "Please answer every short-answer question."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        `/quizzes/${quizId}/short-answers/submit`,
        {
          answers: questions.map(
            (question) => ({
              question_id: question.id,
              answer: answers[
                question.id
              ].trim(),
            })
          ),
        }
      );

      onFinish(response.data.results);

    } catch (error: unknown) {
      console.error("Short-answer submission error:", error);

      const detail = getApiErrorDetail(
        error,
        "Could not submit short-answer responses.",
      );

      alert(detail);

    } finally {
      setSubmitting(false);
    }
  }


  async function goNext() {
    if (!currentAnswer.trim()) {
      alert(
        "Write an answer before continuing."
      );
      return;
    }

    if (
      currentIndex <
      questions.length - 1
    ) {
      setCurrentIndex(
        (current) => current + 1
      );

      return;
    }

    await submitAnswers();
  }


  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#d98a28]">
            Short Answer
          </p>

          <p className="mt-1 text-sm text-[#66736e]">
            Question {currentIndex + 1} of{" "}
            {questions.length}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {questions.map(
            (question, index) => (
              <span
                key={question.id}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-7 bg-[#173f35]"
                    : index < currentIndex
                    ? "w-2.5 bg-[#8da097]"
                    : "w-2.5 bg-[#e4e1d8]"
                }`}
              />
            )
          )}
        </div>
      </div>


      {/* Question card */}
      <section className="mt-7 rounded-3xl border border-[#ddd8cb] bg-white p-8 shadow-sm">
        {currentQuestion.topic && (
          <p className="text-sm font-semibold text-[#2f6655]">
            {currentQuestion.topic}
          </p>
        )}

        <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-[#172c26]">
          {currentQuestion.question}
        </h2>

        <p className="mt-4 text-sm leading-6 text-[#76817d]">
          Explain the idea in your own words.
          A few sentences is enough.
        </p>


        <textarea
          value={currentAnswer}
          onChange={(event) =>
            updateAnswer(event.target.value)
          }
          placeholder="Type your answer here..."
          rows={7}
          disabled={submitting}
          className="mt-7 w-full resize-none rounded-2xl border border-[#ddd8cb] bg-[#fbfaf7] px-5 py-4 text-base leading-7 text-[#37443f] outline-none transition placeholder:text-[#a1aaa6] focus:border-[#52756a] focus:ring-2 focus:ring-[#52756a]/10 disabled:opacity-60"
        />


        <div className="mt-2 flex justify-end">
          <p className="text-xs text-[#9aa39f]">
            {currentAnswer.length} characters
          </p>
        </div>
      </section>


      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goPrevious}
          disabled={
            currentIndex === 0 ||
            submitting
          }
          className="rounded-xl px-5 py-3 font-medium text-[#52665f] disabled:opacity-30"
        >
          ← Previous
        </button>


        <button
          onClick={goNext}
          disabled={submitting}
          className="rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white transition hover:bg-[#215447] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Submitting..."
            : currentIndex ===
              questions.length - 1
            ? "Finish Quiz"
            : "Next →"}
        </button>
      </div>
    </div>
  );
}


export default ShortAnswerSession;
