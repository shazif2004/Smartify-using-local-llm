import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 lg:px-10">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#123f35] text-2xl shadow-sm">
          📚
        </div>

        <span className="font-serif text-3xl font-bold text-[#102d26]">
          Smartify
        </span>
      </Link>

      <nav className="flex items-center gap-5">
        <span className="hidden text-sm font-semibold text-[#52665f] sm:inline">
          Private · gemma4:26b
        </span>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-[#123f35] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d3129]"
        >
          Open library
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
