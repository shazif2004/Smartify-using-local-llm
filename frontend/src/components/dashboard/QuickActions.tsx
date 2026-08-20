type QuickActionsProps = {
  onUploadClick: () => void;
};

function QuickActions({ onUploadClick }: QuickActionsProps) {
  return (
    <section className="rounded-3xl border border-[#ddd8cb] bg-white p-7 shadow-sm">
      <h2 className="font-serif text-2xl font-bold text-[#102d26]">
        Quick actions
      </h2>

      <p className="mt-2 text-[#68736f]">
        Upload course material and start studying.
      </p>

      <button
        onClick={onUploadClick}
        className="mt-6 rounded-xl bg-[#123f35] px-5 py-3 font-semibold text-white hover:bg-[#0d3129]"
      >
        Upload PDF
      </button>
    </section>
  );
}

export default QuickActions;