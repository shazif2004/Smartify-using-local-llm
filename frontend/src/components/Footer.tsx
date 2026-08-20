function Footer() {
  return (
    <footer className="border-t border-[#dfdbd1] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row lg:px-10">
        <a href="#" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123f35] text-xl">
            📚
          </div>

          <span className="font-serif text-2xl font-bold text-[#102d26]">
            Smartify
          </span>
        </a>

        <p className="text-[#68736f]">
          Learn deeply. Built for curious minds.
        </p>
      </div>
    </footer>
  );
}

export default Footer;