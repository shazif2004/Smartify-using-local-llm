import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/documents/upload", formData);

      alert("Upload successful!");

      navigate("/dashboard");
    } catch {
      alert("Upload failed.");
    }

    setUploading(false);
  }

  return (
    <main className="min-h-screen bg-[#fbfaf6] flex justify-center items-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-xl">

        <h1 className="font-serif text-4xl font-bold text-[#123f35]">
          Upload PDF
        </h1>

        <p className="mt-3 text-[#6b7471]">
          Upload your lecture slides, notes or textbook chapter.
        </p>

        <input
          className="mt-8"
          type="file"
          accept=".pdf"
          onChange={(e) => {
            if (e.target.files)
              setFile(e.target.files[0]);
          }}
        />

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-8 w-full rounded-xl bg-[#123f35] text-white py-3 font-semibold"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

      </div>
    </main>
  );
}

export default UploadPage;