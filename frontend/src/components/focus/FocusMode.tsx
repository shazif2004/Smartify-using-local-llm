import { useEffect, useState } from "react";

export type FocusConcept = {
  title: string;
  plain_explanation: string;
  why_it_matters: string;
  key_points: string[];
  check_your_understanding: string;
};

export type FocusBreakdown = {
  title: string;
  concepts: FocusConcept[];
};

type FocusModeProps = {
  breakdown: FocusBreakdown | null;
  loading: boolean;
  error: string;
  onExit: () => void;
  onRetry: () => void;
};

const FOCUS_SECONDS = 25 * 60;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function FocusMode({
  breakdown,
  loading,
  error,
  onExit,
  onRetry,
}: FocusModeProps) {
  const [conceptIndex, setConceptIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);

  const concepts = breakdown?.concepts ?? [];
  const concept = concepts[conceptIndex] ?? null;
  const isLastConcept = conceptIndex === concepts.length - 1;
  const progress = concepts.length
    ? ((conceptIndex + 1) / concepts.length) * 100
    : 0;

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onExit();
      }

      if (event.key === "ArrowLeft" && conceptIndex > 0) {
        setConceptIndex((current) => current - 1);
      }

      if (event.key === "ArrowRight" && conceptIndex < concepts.length - 1) {
        setConceptIndex((current) => current + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [conceptIndex, concepts.length, onExit]);

  function toggleTimer() {
    if (secondsLeft === 0) {
      setSecondsLeft(FOCUS_SECONDS);
      setTimerRunning(true);
      return;
    }

    setTimerRunning((current) => !current);
  }

  function resetTimer() {
    setTimerRunning(false);
    setSecondsLeft(FOCUS_SECONDS);
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-screen flex-col overflow-hidden bg-[#fbfaf6] text-[#172c26]">
      <header className="shrink-0 border-b border-[#ebe7de] bg-[#fbfaf6]/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-3 rounded-full px-2 py-2 text-base font-semibold text-[#5e706a] transition hover:bg-[#f0eee8] hover:text-[#173f35]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Exit focus
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#83908b] sm:inline">
              Optional timer
            </span>

            <button
              type="button"
              onClick={resetTimer}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold tabular-nums transition sm:px-5 ${
                secondsLeft === 0
                  ? "bg-[#fbe7cc] text-[#9b5b12]"
                  : "bg-[#e7f0ec] text-[#526b63] hover:bg-[#dceae4]"
              }`}
              aria-label="Reset the 25-minute timer"
              title="Reset timer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 1.5M9 2h6" />
              </svg>
              {secondsLeft === 0 ? "Time’s up" : formatTime(secondsLeft)}
            </button>

            <button
              type="button"
              onClick={toggleTimer}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f0ec] text-[#173f35] transition hover:bg-[#d7e7e0] sm:h-12 sm:w-12"
              aria-label={timerRunning ? "Pause focus timer" : "Start focus timer"}
            >
              {timerRunning ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <rect x="7" y="5" width="4" height="14" rx="1" />
                  <rect x="13" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-0.5 h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="m8 5 11 7-11 7V5Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="h-1.5 bg-[#eeece6]">
          <div
            className="h-full rounded-r-full bg-[#df922f] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {loading && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#dce7e2] border-t-[#173f35]" />
          <h1 className="mt-7 font-serif text-3xl font-bold text-[#172c26]">
            Preparing focus mode
          </h1>
          <p className="mt-3 text-lg text-[#687973]">
            Breaking this into clear, focused concepts with gemma4:26b…
          </p>
        </main>
      )}

      {!loading && error && (
        <main className="flex flex-1 items-center justify-center px-6">
          <section className="max-w-lg rounded-3xl border border-[#ead8ce] bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-3xl font-bold">
              Focus mode needs another try
            </h1>
            <p className="mt-3 leading-7 text-[#68736f]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-7 rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white transition hover:bg-[#245447]"
            >
              Try again
            </button>
          </section>
        </main>
      )}

      {!loading && !error && concept && (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <article className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14 lg:py-16">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d48224]">
                Concept {conceptIndex + 1} of {concepts.length}
              </p>

              <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight text-[#142a24] sm:text-5xl lg:text-6xl">
                {concept.title}
              </h1>

              <p className="mt-8 max-w-4xl whitespace-pre-line text-xl leading-9 text-[#3f4c47] sm:text-2xl sm:leading-[1.75]">
                {concept.plain_explanation}
              </p>

              <section className="mt-10 max-w-4xl rounded-3xl border border-[#dce6e1] bg-[#edf4f0] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f6655]">
                  Why it matters
                </p>
                <p className="mt-3 text-lg leading-8 text-[#40534c]">
                  {concept.why_it_matters}
                </p>
              </section>

              <section className="mt-10 max-w-4xl">
                <h2 className="font-serif text-2xl font-bold text-[#172c26]">
                  Keep these in mind
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {concept.key_points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 rounded-2xl border border-[#e4e0d6] bg-white p-4 text-base leading-7 text-[#43504b] shadow-sm"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#df922f]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10 max-w-4xl border-l-4 border-[#173f35] py-2 pl-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64766f]">
                  Quick check
                </p>
                <p className="mt-2 text-lg font-semibold leading-8 text-[#233a32]">
                  {concept.check_your_understanding}
                </p>
              </section>
            </article>
          </main>

          <footer className="shrink-0 border-t border-[#ebe7de] bg-[#fbfaf6] px-6 py-4 sm:px-10 sm:py-5">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-5">
              <button
                type="button"
                disabled={conceptIndex === 0}
                onClick={() => setConceptIndex((current) => current - 1)}
                className="rounded-full px-5 py-3 font-semibold text-[#5e706a] transition hover:bg-[#efede7] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Back
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                {concepts.map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    type="button"
                    onClick={() => setConceptIndex(index)}
                    aria-label={`Open concept ${index + 1}`}
                    aria-current={conceptIndex === index ? "step" : undefined}
                    className={`h-2.5 rounded-full transition-all ${
                      conceptIndex === index
                        ? "w-10 bg-[#173f35]"
                        : "w-2.5 bg-[#e7e4dd] hover:bg-[#c8d2cd]"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isLastConcept) {
                    onExit();
                  } else {
                    setConceptIndex((current) => current + 1);
                  }
                }}
                className="rounded-full bg-[#173f35] px-7 py-3 font-semibold text-white transition hover:bg-[#245447]"
              >
                {isLastConcept ? "Finish" : "Next →"}
              </button>
            </div>
          </footer>
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {secondsLeft === 0 ? "Your 25-minute focus timer is complete." : ""}
      </span>
    </div>
  );
}

export default FocusMode;
