const features = [
  {
    icon: "📄",
    title: "Upload your own material",
    description:
      "Drop in lecture PDFs, textbook chapters, or class notes. Smartify reads and understands them.",
  },
  {
    icon: "🧠",
    title: "Explained your way",
    description:
      "Choose any section from your document and instantly turn it into clear explanations, concise summaries, or exam-ready notes.",
  },
  {
    icon: "?",
    title: "“I still don't get it”",
    description:
      "One tap gives you a fresh analogy, smaller steps, or a new example, never the same explanation twice.",
  },
  {
    icon: "☑",
    title: "Quizzes that check understanding",
    description:
      "Auto-generated multiple-choice and short-answer questions, each with a clear explanation.",
  },
  {
    icon: "◔",
    title: "Understanding meter",
    description:
      "See exactly how well you understand a topic and which sub-concepts still need work.",
  },
  {
    icon: "⌗",
    title: "ADHD Focus Mode",
    description:
      "One concept at a time, a minimal interface, gentle progress bar, and optional 25-minute timer.",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="border-t border-[#e2ded4] bg-[#fbfaf6] py-28"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-4xl">
          <h2 className="font-serif text-4xl font-bold leading-tight text-[#102d26] sm:text-5xl">
            Not a search engine for lessons. A tutor for your material.
          </h2>

          <p className="mt-6 text-lg leading-8 text-[#68736f]">
            Everything works on the notes you actually study from, so the help
            is always relevant to your exam.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="min-h-[320px] rounded-3xl border border-[#ddd8cb] bg-white p-8 shadow-[0_12px_35px_rgba(31,53,47,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(31,53,47,0.1)]"
            >
              <div className="mb-8 flex h-10 w-10 items-center justify-center text-2xl font-semibold text-[#123f35]">
                {feature.icon}
              </div>

              <h3 className="font-serif text-2xl font-bold leading-tight text-[#102d26]">
                {feature.title}
              </h3>

              <p className="mt-5 text-base leading-8 text-[#68736f]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;