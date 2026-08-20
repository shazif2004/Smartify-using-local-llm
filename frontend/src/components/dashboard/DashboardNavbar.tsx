import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../services/api";

function DashboardNavbar() {
  const navigate = useNavigate();
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function checkModel() {
      try {
        const response = await api.get("/health", { timeout: 4_000 });
        if (active) setModelReady(response.data.ollama === "ready");
      } catch {
        if (active) setModelReady(false);
      }
    }

    void checkModel();
    const timer = window.setInterval(checkModel, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="border-b border-[#ddd8cb] bg-[#fbfaf6]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-3"
          aria-label="Go to Smartify home page"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f35] text-xl">
            📚
          </div>

          <span className="font-serif text-2xl font-bold text-[#172c26]">
            Smartify
          </span>
        </Link>

        <nav className="flex items-center gap-5">
          <div
            className="hidden items-center gap-2 rounded-full border border-[#d9ded9] bg-white px-4 py-2 text-sm font-semibold text-[#52665f] sm:flex"
            title={
              modelReady === false
                ? "Ollama is not ready. Open Ollama and make sure gemma4:26b is installed."
                : "Private AI running on this Mac"
            }
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                modelReady === null
                  ? "bg-amber-400"
                  : modelReady
                    ? "bg-emerald-500"
                    : "bg-red-500"
              }`}
            />
            {modelReady === null
              ? "Checking local AI…"
              : modelReady
                ? "gemma4:26b · Local"
                : "Ollama offline"}
          </div>

          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="rounded-full bg-[#e79a2c] px-5 py-2.5 font-semibold text-[#172c26]"
          >
            + Add material
          </button>
        </nav>
      </div>
    </header>
  );
}

export default DashboardNavbar;
