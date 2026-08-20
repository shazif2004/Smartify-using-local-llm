import { useNavigate } from "react-router-dom";

export type DocumentItem = {
  id: number;
  filename: string;
  character_count: number;
  uploaded_at: string;
  owner_id: number;
};

type DocumentsListProps = {
  documents: DocumentItem[];
  loading: boolean;
}; 

function DocumentsList({
  documents,
  loading,
}: DocumentsListProps) {

    const navigate = useNavigate();

  return (
    <section className="rounded-3xl border border-[#ddd8cb] bg-white p-7 shadow-sm">
      <h2 className="font-serif text-2xl font-bold text-[#102d26]">
        My documents
      </h2>

      {loading && (
        <p className="mt-5 text-[#68736f]">
          Loading documents...
        </p>
      )}

      {!loading && documents.length === 0 && (
        <p className="mt-5 text-[#68736f]">
          You have not uploaded any documents yet.
        </p>
      )}

      {!loading && documents.length > 0 && (
        <div className="mt-6 space-y-4">
          {documents.map((document) => (
            <article
              key={document.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#e4dfd3] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="font-semibold text-[#183c33]">
                  {document.filename}
                </h3>

                <p className="mt-1 text-sm text-[#7a8581]">
                  {document.character_count.toLocaleString()} characters
                </p>
              </div>

              <button
                onClick={() => navigate(`/study/${document.id}`)}
                className="rounded-xl border border-[#d8d2c5] px-4 py-2 text-sm font-semibold text-[#273c36] hover:bg-[#f7f4ec]"
                >
                    Study
                </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default DocumentsList;