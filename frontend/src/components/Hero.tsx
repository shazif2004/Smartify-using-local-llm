import { useNavigate } from "react-router-dom";

const explanationModes = [
  "Explain Like I'm 10",
  "College Level",
  "Simple English",
  "30-Second Summary",
  "Exam Review",
];


function Hero() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 pt-16 text-center lg:px-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ded8ca] bg-white px-5 py-2 text-sm font-semibold text-[#245d50] shadow-sm">
        <span className="text-[#d98a28]">✦</span>
        Your material. Finally understood.
      </div>

      <h1 className="mx-auto mt-10 max-w-5xl font-serif text-5xl font-bold leading-[0.98] tracking-tight text-[#102d26] sm:text-6xl lg:text-8xl">
        Understand the hard parts of anything you{" "}
        <span className="relative inline-block">
          study
          <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-[#de8b29]" />
        </span>
        .
      </h1>

      <p className="mx-auto mt-10 max-w-3xl text-lg leading-8 text-[#62706c]">
        Smartify turns your own lecture notes into a patient AI tutor. Upload
        your material and leave understanding it, not just reading it.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-2xl bg-[#123f35] px-8 py-4 font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0d3129]"
        >
          Upload your notes <span className="ml-2">→</span>
        </button>

        <button
          onClick={() => navigate("/dashboard")}
        className="rounded-2xl border border-[#dcd5c7] bg-white px-8 py-4 font-semibold text-[#183c33] transition hover:bg-[#f7f4ec]"
        >
          Browse my library
        </button>
      </div>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        {explanationModes.map((mode) => (
          <span
            key={mode}
            className="rounded-full border border-[#ded8ca] bg-white px-5 py-2 text-sm font-medium text-[#415650] shadow-sm"
          >
            {mode}
          </span>
        ))}
      </div>
    </section>
  );
}

export default Hero;