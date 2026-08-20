import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardNavbar from "../components/dashboard/DashboardNavbar";
import FocusMode from "../components/focus/FocusMode";
import type { FocusBreakdown } from "../components/focus/FocusMode";
import api, { getApiErrorDetail } from "../services/api";

type Document = {
  id: number;
  filename: string;
  extracted_text: string;
  character_count: number;
  uploaded_at: string;
  owner_id: number;
};

type DocumentChunk = {
  id: number;
  document_id: number;
  page_number: number;
  chunk_index: number;
  title: string | null;
  content: string;
  word_count: number;
  char_count: number;
};

type ExplanationMode =
  | "explain_like_im_10"
  | "college_level"
  | "simple_english"
  | "thirty_second_summary"
  | "exam_review";

type QuizDifficulty = "easy" | "medium" | "hard";

const quizDifficulties: {
  value: QuizDifficulty;
  title: string;
  description: string;
}[] = [
  {
    value: "easy",
    title: "Easy",
    description: "Core ideas and straightforward recall",
  },
  {
    value: "medium",
    title: "Medium",
    description: "Understanding, connections, and application",
  },
  {
    value: "hard",
    title: "Hard",
    description: "Deeper reasoning and subtle distinctions",
  },
];

const explanationModes: {
  value: ExplanationMode;
  title: string;
  description: string;
}[] = [
  {
    value: "explain_like_im_10",
    title: "Explain Like I'm 10",
    description: "Playful, everyday analogies",
  },
  {
    value: "college_level",
    title: "College Level",
    description: "Rigorous and precise",
  },
  {
    value: "simple_english",
    title: "Simple English",
    description: "Plain, jargon-free language",
  },
  {
    value: "thirty_second_summary",
    title: "30-Second Summary",
    description: "The essential core, fast",
  },
  {
    value: "exam_review",
    title: "Exam Review",
    description: "Key points to memorize",
  },
];

function improveMathSpacing(text: string) {
  return text.replaceAll("\\frac", "\\dfrac");
}

function StudyPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<number | null>(null);
  const selectedChunk = chunks.find((chunk) => chunk.id === selectedChunkId) ?? null;
  const [loading, setLoading] = useState(true);
  const [chunkSearch, setChunkSearch] = useState("");

  const [selectedMode, setSelectedMode] =
    useState<ExplanationMode>("simple_english");

  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [showQuizSetup, setShowQuizSetup] = useState(false);
  const [quizDifficulty, setQuizDifficulty] =
    useState<QuizDifficulty>("medium");
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [focusBreakdown, setFocusBreakdown] =
    useState<FocusBreakdown | null>(null);
  const [generatingFocus, setGeneratingFocus] = useState(false);
  const [focusError, setFocusError] = useState("");

  const filteredChunks = chunks.filter((chunk) => {
  const label =
    chunk.title || `Section ${chunk.chunk_index + 1}`;

  return label
    .toLowerCase()
    .includes(chunkSearch.toLowerCase());
});

  useEffect(() => {
  async function loadStudyMaterial() {
    try {
      const [documentResponse, chunksResponse] = await Promise.all([
        api.get(`/documents/${documentId}`),
        api.get(`/documents/${documentId}/chunks`),
      ]);

      setDocument(documentResponse.data);
      setChunks(chunksResponse.data);

      if (chunksResponse.data.length > 0) {
        setSelectedChunkId(chunksResponse.data[0].id);
      }
    } catch (error) {
      console.error("Study material loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  loadStudyMaterial();
}, [documentId]);

  async function handleExplain(mode: ExplanationMode) {
    if (!document || !selectedChunk) return;

    setSelectedMode(mode);
    setExplaining(true);
    setExplanation("");

    try {
      const response = await api.post(
        `/documents/${document.id}/explain`,
        {
  selected_text: selectedChunk.content,
  mode,
}
      );

      setExplanation(response.data.explanation);
    } catch (error: unknown) {
      console.error("Explanation error:", error);

      const detail = getApiErrorDetail(
        error,
        "Could not reach gemma4:26b. Make sure Ollama is running.",
      );

      alert(detail);
    } finally {
      setExplaining(false);
    }
  }

  async function handleGenerateQuiz() {
    if (!document) return;

    setGeneratingQuiz(true);

    try {
      const response = await api.post(
        `/quizzes/documents/${document.id}/generate`,
        {
          difficulty: quizDifficulty,
          number_of_questions: 5,
        },
      );

      navigate("/quiz", {
        state: {
          quiz: response.data,
        },
      });
    } catch (error: unknown) {
      console.error("Quiz generation error:", error);

      const detail = getApiErrorDetail(
        error,
        "Could not reach gemma4:26b. Make sure Ollama is running.",
      );

      alert(detail);
    } finally {
      setGeneratingQuiz(false);
    }
  }

  async function generateFocusBreakdown() {
    if (!document || generatingFocus) return;

    setGeneratingFocus(true);
    setFocusError("");

    try {
      const response = await api.post<FocusBreakdown>(
        `/documents/${document.id}/focus`,
      );
      setFocusBreakdown(response.data);
    } catch (error: unknown) {
      console.error("Focus mode generation error:", error);
      setFocusError(
        getApiErrorDetail(
          error,
          "Could not prepare focus mode. Make sure Ollama is running.",
        ),
      );
    } finally {
      setGeneratingFocus(false);
    }
  }

  function handleOpenFocusMode() {
    setShowFocusMode(true);

    if (!focusBreakdown && !generatingFocus) {
      void generateFocusBreakdown();
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5ed] p-10">
        <p className="text-[#68736f]">Loading material...</p>
      </main>
    );
  }

  if (!document) {
    return (
      <main className="min-h-screen bg-[#f8f5ed] p-10">
        <p className="text-[#68736f]">Document not found.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ed]">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between gap-5">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm font-medium text-[#52665f]"
            >
              ← Library
            </button>

            <h1 className="mt-4 break-words font-serif text-5xl font-bold text-[#172c26]">
              {document.filename}
            </h1>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              onClick={handleOpenFocusMode}
              className="flex items-center gap-2 rounded-full border border-[#d8d2c5] bg-white px-5 py-3 font-semibold text-[#173f35] shadow-sm transition hover:border-[#aab8b2] hover:bg-[#fdfcf9]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Focus
            </button>

            <button
              onClick={() => setShowExplainPanel(true)}
              className="rounded-full border border-[#d8d2c5] bg-white px-5 py-3 font-semibold text-[#173f35] shadow-sm"
            >
              Explain
            </button>

            <button
              onClick={() => setShowQuizSetup(true)}
              disabled={generatingQuiz}
              className="rounded-full bg-[#173f35] px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              Take a quiz
            </button>
          </div>
        </div>

        <div
          className={`mt-8 grid items-start gap-8 ${
            showExplainPanel
              ? "lg:grid-cols-[minmax(0,1fr)_390px]"
              : "grid-cols-1"
          }`}
        >
          <section className="min-w-0">
            <div className="rounded-2xl border border-dashed border-[#ddd8cb] bg-white px-5 py-4 text-[#68736f]">
              ✨ Open the explanation panel and choose how Smartify
              should explain this material.
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
  <aside className="overflow-hidden rounded-3xl border border-[#ddd8cb] bg-white shadow-sm">
  <div className="border-b border-[#ebe6dc] px-5 py-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7c76]">
          Document
        </p>

        <h2 className="mt-1 text-lg font-bold text-[#172c26]">
          Contents
        </h2>
      </div>

      <div className="rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-semibold text-[#2f6655]">
        {chunks.length} sections
      </div>
    </div>

    <div className="relative mt-4">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89938f]"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="text"
        value={chunkSearch}
        onChange={(event) => setChunkSearch(event.target.value)}
        placeholder="Search sections..."
        className="w-full rounded-xl border border-[#e1ddd4] bg-[#faf8f3] py-2.5 pl-10 pr-3 text-sm text-[#37443f] outline-none transition placeholder:text-[#9a9f9c] focus:border-[#6f9185] focus:ring-2 focus:ring-[#dfeae5]"
      />
    </div>
  </div>

  <div className="max-h-[650px] overflow-y-auto p-3">
    <div className="space-y-1.5">
      {filteredChunks.map((chunk, index) => {
        const isSelected = selectedChunkId === chunk.id;

        return (
          <button
            key={chunk.id}
            type="button"
            onClick={() => {
              setSelectedChunkId(chunk.id);
              setExplanation("");
            }}
            className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all ${
              isSelected
                ? "border-[#b8cec5] bg-[#edf4f0] shadow-sm"
                : "border-transparent bg-transparent hover:border-[#e4e0d7] hover:bg-[#faf8f3]"
            }`}
          >
            {isSelected && (
              <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#173f35]" />
            )}

            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected
                    ? "bg-[#173f35] text-white"
                    : "bg-[#eeeae2] text-[#68736f] group-hover:bg-[#e1e9e5]"
                }`}
              >
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`line-clamp-2 text-sm font-semibold leading-5 ${
                    isSelected
                      ? "text-[#173f35]"
                      : "text-[#37443f]"
                  }`}
                >
                  {chunk.title ||
                    `Section ${chunk.chunk_index + 1}`}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-[#7d8984]">
                  <span>Page {chunk.page_number}</span>

                  <span className="h-1 w-1 rounded-full bg-[#b7bdb9]" />

                  <span>{chunk.word_count} words</span>
                </div>
              </div>

              <span
                className={`mt-1 text-sm transition ${
                  isSelected
                    ? "translate-x-0 text-[#2f6655]"
                    : "-translate-x-1 text-[#b0b7b3] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                →
              </span>
            </div>
          </button>
        );
      })}

      {filteredChunks.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#68736f]">
            No sections found
          </p>

          <button
            type="button"
            onClick={() => setChunkSearch("")}
            className="mt-2 text-sm font-semibold text-[#2f6655]"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  </div>
</aside>

  <article className="min-w-0 overflow-hidden rounded-3xl border border-[#ddd8cb] bg-white shadow-sm">
  {selectedChunk ? (
    <>
      <header className="border-b border-[#ebe6dc] px-8 py-7 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2f6655]">
            Page {selectedChunk.page_number}
          </span>

          <span className="rounded-full bg-[#f5f2eb] px-3 py-1 text-xs font-semibold text-[#68736f]">
            {selectedChunk.word_count} words
          </span>

          <span className="rounded-full bg-[#f5f2eb] px-3 py-1 text-xs font-semibold text-[#68736f]">
            Section {selectedChunk.chunk_index + 1}
          </span>
        </div>

        <h2 className="mt-4 max-w-4xl font-serif text-3xl font-bold leading-tight text-[#172c26] lg:text-4xl">
          {selectedChunk.title ||
            `Section ${selectedChunk.chunk_index + 1}`}
        </h2>
      </header>

      <div className="px-8 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-4xl whitespace-pre-wrap text-[17px] leading-9 text-[#37443f]">
          {selectedChunk.content}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-[#ebe6dc] bg-[#fcfaf6] px-8 py-5 lg:px-10">
        <button
          type="button"
          disabled={selectedChunk.chunk_index === 0}
          onClick={() => {
            const currentIndex = chunks.findIndex(
              (chunk) => chunk.id === selectedChunk.id
            );

            if (currentIndex > 0) {
              setSelectedChunkId(chunks[currentIndex - 1].id);
              setExplanation("");
            }
          }}
          className="rounded-full border border-[#ddd8cb] bg-white px-4 py-2 text-sm font-semibold text-[#52665f] transition hover:border-[#aebbb5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Previous
        </button>

        <p className="text-sm text-[#7d8984]">
          {selectedChunk.chunk_index + 1} of {chunks.length}
        </p>

        <button
          type="button"
          disabled={
            selectedChunk.chunk_index === chunks.length - 1
          }
          onClick={() => {
            const currentIndex = chunks.findIndex(
              (chunk) => chunk.id === selectedChunk.id
            );

            if (currentIndex < chunks.length - 1) {
              setSelectedChunkId(chunks[currentIndex + 1].id);
              setExplanation("");
            }
          }}
          className="rounded-full bg-[#173f35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#245447] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </footer>
    </>
  ) : (
    <div className="flex min-h-[400px] items-center justify-center p-10">
      <p className="text-[#68736f]">
        No sections were found for this document.
      </p>
    </div>
  )}
</article>
</div>
          </section>

          {showExplainPanel && (
            <aside className="flex max-h-none flex-col overflow-hidden rounded-3xl border border-[#ddd8cb] bg-white shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
              <div className="shrink-0 border-b border-[#e7e2d8] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#2f6655]">
                      Explaining
                    </p>

                    <p className="mt-3 line-clamp-3 break-words italic text-[#68736f]">
                      “{document.filename}”
                    </p>
                  </div>

                  <button
                    onClick={() => setShowExplainPanel(false)}
                    className="shrink-0 text-xl text-[#68736f]"
                    aria-label="Close explanation panel"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <h2 className="font-semibold text-[#172c26]">
                  How should I explain it?
                </h2>

                <div className="mt-5 space-y-3">
                  {explanationModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => handleExplain(mode.value)}
                      disabled={explaining}
                      className={`w-full rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedMode === mode.value
                          ? "border-[#173f35] bg-[#edf3ef]"
                          : "border-[#e2ddd2] bg-white hover:border-[#aab5b0]"
                      }`}
                    >
                      <p className="font-semibold text-[#172c26]">
                        {mode.title}
                      </p>

                      <p className="mt-1 text-sm text-[#68736f]">
                        {mode.description}
                      </p>
                    </button>
                  ))}
                </div>

                {explaining && (
                  <div className="mt-6 rounded-2xl bg-[#f5f2eb] p-5 text-[#52665f]">
                    Generating explanation...
                  </div>
                )}

                {explanation && !explaining && (
                  <section className="mt-6 rounded-2xl bg-[#f5f2eb] p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#2f6655]">
                      AI Explanation
                    </p>

                    <div className="prose prose-neutral mt-3 max-w-none leading-8 text-[#43504b]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-4 leading-7 last:mb-0">
                              {children}
                            </p>
                          ),

                          strong: ({ children }) => (
                            <strong className="font-bold text-[#172c26]">
                              {children}
                            </strong>
                          ),

                          ul: ({ children }) => (
                            <ul className="mb-5 ml-6 list-disc space-y-3">
                              {children}
                            </ul>
                          ),

                          ol: ({ children }) => (
                            <ol className="mb-5 ml-6 list-decimal space-y-3">
                              {children}
                            </ol>
                          ),

                          li: ({ children }) => (
                            <li className="pl-1 leading-7 marker:text-[#d98b2b]">
                              {children}
                            </li>
                          ),

                          h1: ({ children }) => (
                            <h1 className="mb-4 mt-6 font-serif text-2xl font-bold text-[#172c26]">
                              {children}
                            </h1>
                          ),

                          h2: ({ children }) => (
                            <h2 className="mb-3 mt-5 text-xl font-bold text-[#172c26]">
                              {children}
                            </h2>
                          ),

                          h3: ({ children }) => (
                            <h3 className="mb-3 mt-4 text-lg font-bold text-[#172c26]">
                              {children}
                            </h3>
                          ),
                        }}
                      >
                        {improveMathSpacing(explanation)}
                      </ReactMarkdown>
                    </div>
                  </section>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {showFocusMode && (
        <FocusMode
          breakdown={focusBreakdown}
          loading={generatingFocus}
          error={focusError}
          onExit={() => setShowFocusMode(false)}
          onRetry={() => void generateFocusBreakdown()}
        />
      )}

      {showQuizSetup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d26]/45 px-5 backdrop-blur-sm"
          onMouseDown={() => {
            if (!generatingQuiz) setShowQuizSetup(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-setup-title"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#ded8ca] bg-[#fbfaf6] shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between border-b border-[#e7e2d8] px-7 py-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d98a28]">
                  Quiz setup
                </p>
                <h2
                  id="quiz-setup-title"
                  className="mt-2 font-serif text-3xl font-bold text-[#172c26]"
                >
                  Choose your difficulty
                </h2>
                <p className="mt-2 text-[#68736f]">
                  Smartify will create 5 multiple-choice and 3 short-answer questions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQuizSetup(false)}
                disabled={generatingQuiz}
                aria-label="Close quiz setup"
                className="text-2xl text-[#7d8984] disabled:opacity-40"
              >
                ×
              </button>
            </header>

            <div className="space-y-3 p-7">
              {quizDifficulties.map((difficulty) => {
                const selected = quizDifficulty === difficulty.value;

                return (
                  <button
                    key={difficulty.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setQuizDifficulty(difficulty.value)}
                    disabled={generatingQuiz}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${
                      selected
                        ? "border-[#173f35] bg-[#edf3ef] shadow-sm"
                        : "border-[#ded8ca] bg-white hover:border-[#9eb0a9]"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        selected
                          ? "bg-[#173f35] text-white"
                          : "bg-[#f1eee6] text-[#52665f]"
                      }`}
                    >
                      {difficulty.value === "easy"
                        ? "1"
                        : difficulty.value === "medium"
                          ? "2"
                          : "3"}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[#172c26]">
                        {difficulty.title}
                      </span>
                      <span className="mt-1 block text-sm text-[#68736f]">
                        {difficulty.description}
                      </span>
                    </span>

                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        selected
                          ? "border-[#173f35] bg-[#173f35] shadow-[inset_0_0_0_4px_white]"
                          : "border-[#c8c3b8]"
                      }`}
                    />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz}
                className="mt-3 w-full rounded-full bg-[#173f35] px-6 py-3.5 font-semibold text-white transition hover:bg-[#245447] disabled:cursor-wait disabled:opacity-70"
              >
                {generatingQuiz
                  ? `Creating ${quizDifficulty} quiz…`
                  : `Create ${quizDifficulty} quiz`}
              </button>

              {generatingQuiz && (
                <p className="text-center text-sm text-[#68736f]">
                  gemma4:26b is building your questions locally.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default StudyPage;
