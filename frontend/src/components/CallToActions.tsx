function CallToAction() {
  return (
    <section className="bg-[#fbfaf6] px-6 pb-28 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-[#e4ded0] bg-white px-8 py-20 text-center shadow-[0_25px_70px_rgba(26,48,42,0.08)]">
        <h2 className="font-serif text-4xl font-bold text-[#102d26] sm:text-5xl">
          Bring the topic you&apos;re dreading.
        </h2>

        <p className="mt-5 text-lg text-[#78817e]">
          Upload it now and understand it in the next ten minutes.
        </p>

        <button className="mt-9 rounded-xl bg-[#123f35] px-7 py-3.5 font-semibold text-white transition hover:bg-[#0d3129]">
          Start understanding <span className="ml-2">→</span>
        </button>
      </div>
    </section>
  );
}

export default CallToAction;