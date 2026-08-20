const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const API_PORT = 8765;
const API_ROOT = `http://127.0.0.1:${API_PORT}`;
const MODEL = "gemma4:26b";

let mainWindow = null;
let backendProcess = null;
let ollamaProcess = null;
let backendLogFd = null;

const startupLogPath = path.join(app.getPath("userData"), "smartify-startup.log");

function recordStartup(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  try {
    fs.appendFileSync(startupLogPath, line);
  } catch {
    // Startup must not fail just because diagnostic logging is unavailable.
  }
}

recordStartup("Smartify main process loaded");

function projectRoot() {
  return path.resolve(__dirname, "..", "..");
}

function fetchJson(url, timeout = 1_500) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const request = http.get(url, (response) => {
      if ((response.statusCode ?? 500) >= 400) {
        response.resume();
        finish(null);
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          finish(JSON.parse(body));
        } catch {
          finish(null);
        }
      });
    });

    request.setTimeout(timeout, () => {
      request.destroy();
      finish(null);
    });
    request.on("error", () => finish(null));
  });
}

async function waitUntil(check, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function smartifyApiIsReady() {
  const result = await fetchJson(`${API_ROOT}/`, 1_000);
  return result?.private === true;
}

async function ollamaIsReady() {
  return (await fetchJson("http://127.0.0.1:11434/api/tags", 1_500)) !== null;
}

function findOllama() {
  const candidates = [
    process.env.SMARTIFY_OLLAMA_PATH,
    "/usr/local/bin/ollama",
    "/opt/homebrew/bin/ollama",
    "/Applications/Ollama.app/Contents/Resources/ollama",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? "ollama";
}

async function ensureOllama() {
  if (await ollamaIsReady()) return;

  recordStartup("Ollama was offline; attempting a local start");

  try {
    ollamaProcess = spawn(findOllama(), ["serve"], {
      env: { ...process.env, OLLAMA_HOST: "127.0.0.1:11434" },
      stdio: "ignore",
    });
    ollamaProcess.on("error", () => {
      ollamaProcess = null;
    });
    await waitUntil(ollamaIsReady, 15_000);
    recordStartup("Ollama startup attempt completed");
  } catch {
    // The library still opens when Ollama is unavailable and shows a clear
    // offline indicator. Adding and reading notes does not require the model.
  }
}

async function startBackend() {
  if (await smartifyApiIsReady()) {
    recordStartup("Existing Smartify backend is ready");
    return;
  }

  const environment = {
    ...process.env,
    SMARTIFY_API_PORT: String(API_PORT),
    SMARTIFY_DATA_DIR: path.join(app.getPath("userData"), "data"),
    OLLAMA_BASE_URL: "http://127.0.0.1:11434/v1",
    OLLAMA_MODEL: MODEL,
    EXPLANATION_MODEL: MODEL,
    QUIZ_MODEL: MODEL,
    PYTHONUNBUFFERED: "1",
  };

  if (app.isPackaged) {
    const executable = path.join(
      process.resourcesPath,
      "backend",
      "smartify-backend",
    );
    const logPath = path.join(app.getPath("userData"), "smartify-backend.log");
    recordStartup(`Starting packaged backend at ${executable}`);
    backendLogFd = fs.openSync(logPath, "a");
    try {
      backendProcess = spawn(executable, [], {
        env: environment,
        stdio: ["ignore", backendLogFd, backendLogFd],
      });
    } finally {
      fs.closeSync(backendLogFd);
      backendLogFd = null;
    }
  } else {
    const root = projectRoot();
    const backendDirectory = path.join(root, "backend");
    const python = path.join(backendDirectory, ".venv", "bin", "python");
    backendProcess = spawn(
      python,
      [
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        String(API_PORT),
      ],
      {
        cwd: backendDirectory,
        env: environment,
        stdio: "inherit",
      },
    );
  }

  backendProcess.on("error", () => {
    recordStartup("Backend process emitted an error");
    backendProcess = null;
  });

  backendProcess.on("exit", (code, signal) => {
    recordStartup(`Backend exited code=${code} signal=${signal}`);
  });

  if (!(await waitUntil(smartifyApiIsReady, 30_000))) {
    throw new Error("Smartify's private local service did not start.");
  }

  recordStartup("Smartify backend is ready");
}

function createWindow() {
  recordStartup("Creating Smartify window");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "Smartify",
    backgroundColor: "#f8f5ed",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  const developmentUrl = process.env.SMARTIFY_DEV_SERVER_URL;
  if (developmentUrl) {
    void mainWindow.loadURL(`${developmentUrl}/#/dashboard`);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "index.html"),
      { hash: "/dashboard" },
    );
  }
}

async function launch() {
  recordStartup("Electron app is ready");

  try {
    await startBackend();
  } catch (error) {
    recordStartup(`Backend startup failed: ${error?.stack ?? error}`);
    dialog.showErrorBox(
      "Smartify could not start",
      `${error.message}\n\nRestart the app. If the problem continues, check smartify-backend.log in Smartify's application data folder.`,
    );
    app.quit();
    return;
  }

  createWindow();
  void ensureOllama();
}

app.whenReady().then(launch).catch((error) => {
  recordStartup(`Fatal startup error: ${error?.stack ?? error}`);
  dialog.showErrorBox("Smartify could not start", String(error));
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (backendProcess) backendProcess.kill();
  if (ollamaProcess) ollamaProcess.kill();
  if (backendLogFd !== null) fs.closeSync(backendLogFd);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
