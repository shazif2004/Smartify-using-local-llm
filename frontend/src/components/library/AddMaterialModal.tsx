import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import api, { getApiErrorDetail } from "../../services/api";

type AddMaterialModalProps = {
  open: boolean;
  onClose: () => void;
  onMaterialAdded: () => Promise<void>;
};

function AddMaterialModal({
  open,
  onClose,
  onMaterialAdded,
}: AddMaterialModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function resetModal() {
    setActiveTab("upload");
    setSelectedFile(null);
    setTitle("");
    setNotes("");
    setError("");
  }

  function handleClose() {
    if (submitting) return;

    resetModal();
    onClose();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError("");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setSubmitting(true);
      setError("");

      await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await onMaterialAdded();
      resetModal();
      onClose();
    } catch (error) {
      console.error("Could not upload document", error);
      setError(
        getApiErrorDetail(
          error,
          "Could not upload the document. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaste(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!notes.trim()) {
      setError("Please paste your notes.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post("/documents/paste", {
        title: title.trim(),
        text: notes.trim(),
      });

      await onMaterialAdded();
      resetModal();
      onClose();
    } catch (error) {
      console.error("Could not add pasted notes", error);
      setError(
        getApiErrorDetail(
          error,
          "Could not add your notes. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e7e2d8] px-8 py-6">
          <div>
            <h2 className="font-serif text-3xl font-bold text-[#172c26]">
              Add material
            </h2>

            <p className="mt-1 text-sm text-[#68736f]">
              Upload a PDF or paste your notes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="text-3xl text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="p-8">
          <div className="mb-8 flex rounded-xl bg-[#f3f1eb] p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setError("");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 font-semibold transition ${
                activeTab === "upload"
                  ? "bg-white text-[#172c26] shadow-sm"
                  : "text-[#68736f]"
              }`}
            >
              Upload File
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("paste");
                setError("");
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 font-semibold transition ${
                activeTab === "paste"
                  ? "bg-white text-[#172c26] shadow-sm"
                  : "text-[#68736f]"
              }`}
            >
              Paste Notes
            </button>
          </div>

          {activeTab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="rounded-2xl border-2 border-dashed border-[#d7d2c7] bg-[#fbfaf6] p-12 text-center">
                <div className="text-5xl">📄</div>

                <h3 className="mt-4 text-xl font-semibold text-[#172c26]">
                  Upload your study material
                </h3>

                <p className="mt-2 text-[#68736f]">
                  PDF files are supported for now.
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="mt-7 rounded-full bg-[#173f35] px-6 py-3 font-semibold text-white transition hover:bg-[#12352d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Choose File
                </button>

                {selectedFile && (
                  <p className="mt-4 text-sm font-medium text-[#173f35]">
                    {selectedFile.name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={submitting}
                className="mt-5 w-full rounded-full bg-[#e79a2c] py-3 font-semibold text-[#172c26] transition hover:bg-[#d98a28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Uploading..." : "Upload Material"}
              </button>
            </div>
          )}

          {activeTab === "paste" && (
            <form onSubmit={handlePaste} className="space-y-5">
              <div>
                <label
                  htmlFor="material-title"
                  className="mb-2 block text-sm font-semibold text-[#172c26]"
                >
                  Title
                </label>

                <input
                  id="material-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Neural Networks Week 4"
                  disabled={submitting}
                  className="w-full rounded-xl border border-[#d7d2c7] px-4 py-3 outline-none transition focus:border-[#173f35] disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="material-notes"
                  className="mb-2 block text-sm font-semibold text-[#172c26]"
                >
                  Notes
                </label>

                <textarea
                  id="material-notes"
                  rows={9}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Paste your lecture notes or textbook content here..."
                  disabled={submitting}
                  className="w-full resize-none rounded-xl border border-[#d7d2c7] px-4 py-3 outline-none transition focus:border-[#173f35] disabled:bg-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#173f35] py-3 font-semibold text-white transition hover:bg-[#12352d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add Material"}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddMaterialModal;
