function DemoCard() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 lg:px-10">
      <div className="overflow-hidden rounded-3xl border border-[#dcd7ca] bg-white shadow-[0_20px_60px_rgba(24,50,42,0.08)]">
        <div className="border-b border-[#ddd8cb] px-8 py-5 text-left text-sm font-semibold text-[#566963]">
          Neural Networks — Lecture 7.pdf
        </div>

        <div className="grid md:grid-cols-2">
          <div className="border-b border-[#ddd8cb] p-8 text-left md:border-b-0 md:border-r">
            <p className="text-lg leading-8 text-[#273c36]">
              A neural network learns by adjusting weights through
              backpropagation, propagating the error gradient backwards through
              each layer to nudge every parameter toward a lower loss.
            </p>
          </div>

          <div className="p-8 text-left">
            <div className="mb-5 flex items-center gap-3 font-semibold text-[#17604e]">
              <span className="text-xl">🧠</span>
              Explain Like I&apos;m 10
            </div>

            <p className="text-lg leading-8 text-[#40544e]">
              Imagine baking cookies and they come out too salty. You taste
              them, then walk back through the recipe to fix each step a little.
              That&apos;s backpropagation: learning from the mistake,
              backwards.
            </p>

            <button className="mt-7 rounded-full border border-[#ddd8cb] px-5 py-2.5 text-sm font-medium text-[#415650] transition hover:bg-[#f7f4ec]">
              ? &nbsp; I still don&apos;t get it
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DemoCard;