import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardNavbar from "../components/dashboard/DashboardNavbar";
import AddMaterialModal from "../components/library/AddMaterialModal";
import api from "../services/api";

type DocumentItem = {
  id: number;
  filename: string;
  character_count: number;
  uploaded_at: string;
  owner_id: number;
};

function DashboardPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function handleDelete(documentId: number) {
    const confirmed = window.confirm("Delete this study material?");

    if (!confirmed) return;

    try {
      await api.delete(`/documents/${documentId}`);
      await loadDocuments();
    } catch (error) {
      console.error("Could not delete document", error);
      alert("Could not delete the document.");
    }
  }

  async function loadDocuments() {
    try {
      const response = await api.get<DocumentItem[]>("/documents");
      setDocuments(response.data);
    } catch (error) {
      console.error("Could not load documents", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f5ed]">
      <DashboardNavbar />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#d98a28]">
              Library
            </p>

            <h1 className="mt-3 font-serif text-5xl font-bold text-[#172c26]">
              Your library
            </h1>

            <p className="mt-3 text-lg text-[#68736f]">
              {documents.length}{" "}
              {documents.length === 1 ? "item" : "items"} ready to study.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-full bg-[#e79a2c] px-6 py-3 font-semibold text-[#172c26] shadow-sm transition hover:bg-[#d98a28]"
          >
            + Add material
          </button>
        </section>

        {loading && (
          <p className="mt-10 text-[#68736f]">
            Loading your library...
          </p>
        )}

        {!loading && documents.length === 0 && (
          <section className="mt-10 rounded-3xl border border-[#ddd8cb] bg-white p-10 text-center shadow-sm">
            <h2 className="font-serif text-3xl font-bold text-[#172c26]">
              Your library is empty
            </h2>

            <p className="mt-3 text-[#68736f]">
              Upload a PDF or paste your notes to start studying.
            </p>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-full bg-[#173f35] px-6 py-3 font-semibold text-white transition hover:bg-[#0f3028]"
            >
              Add material
            </button>
          </section>
        )}

        {!loading && documents.length > 0 && (
          <section className="mt-10 grid gap-6">
            {documents.map((document) => {
              const minutes = Math.max(
                1,
                Math.ceil(document.character_count / 5000)
              );

              return (
                <article
                  key={document.id}
                  className="rounded-3xl border border-[#ddd8cb] bg-white p-7 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf1ed] text-xl">
                      📄
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#7c8984]">
                        Study material
                      </p>

                      <p className="mt-1 text-sm text-[#8a9691]">
                        {new Date(document.uploaded_at).toLocaleDateString()}
                      </p>

                      <h2 className="mt-5 truncate font-serif text-3xl font-bold text-[#172c26]">
                        {document.filename}
                      </h2>

                      <p className="mt-3 line-clamp-2 text-[#68736f]">
                        {document.character_count.toLocaleString()} characters
                        ready for explanations and quizzes.
                      </p>

                      <p className="mt-4 text-sm text-[#68736f]">
                        📖 {minutes} min read
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#e7e2d8] pt-5">
                    <button
                    type="button"
                    onClick={() => handleDelete(document.id)}
                    className="rounded-full border border-red-200 px-5 py-2.5 font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>

                  <button
                  type="button"
                  onClick={() => navigate(`/study/${document.id}`)}
                  className="rounded-full bg-[#eaf1ed] px-5 py-2.5 font-semibold text-[#173f35] transition hover:bg-[#dfe9e3]"
                >
                  Study →
                </button>
              </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <AddMaterialModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onMaterialAdded={loadDocuments}
      />
    </div>
  );
}

export default DashboardPage;
