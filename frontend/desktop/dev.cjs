const { spawn } = require("node:child_process");

const vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

async function viteIsReady() {
  try {
    const response = await fetch("http://127.0.0.1:5173", {
      signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForVite() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await viteIsReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function run() {
  if (!(await waitForVite())) {
    vite.kill();
    process.exitCode = 1;
    return;
  }

  const electron = spawn(require("electron"), ["."], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SMARTIFY_DEV_SERVER_URL: "http://127.0.0.1:5173",
    },
    stdio: "inherit",
  });

  electron.on("exit", (code) => {
    vite.kill();
    process.exitCode = code ?? 0;
  });
}

process.on("SIGINT", () => vite.kill());
process.on("SIGTERM", () => vite.kill());

void run();
