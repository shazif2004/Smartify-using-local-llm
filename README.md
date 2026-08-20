# Smartify Local

Smartify is now a private macOS desktop study app powered by the locally
installed Ollama model `gemma4:26b`.

## Install on this Mac

1. Open `frontend/release/Smartify-1.2.0-arm64.dmg`.
2. Drag **Smartify** into **Applications**.
3. Open Smartify. It goes directly to your library; there is no account or
   login screen.

This is a personal, unsigned build. If macOS blocks the first launch,
Control-click Smartify in Applications, choose **Open**, then confirm **Open**.

Smartify checks Ollama when it starts and starts `ollama serve` automatically
when possible. The header shows a green **gemma4:26b · Local** indicator when
the model is ready.

## Privacy and storage

- AI prompts and answers go only to Ollama at `127.0.0.1:11434`.
- The Smartify service listens only on `127.0.0.1:8765`.
- No email, password, API key, hosted database, or cloud AI provider is used.
- The personal library is stored at
  `~/Library/Application Support/Smartify/data/smartify.db`.

## Development

From `frontend`:

```sh
npm run desktop:dev
```

To rebuild the installable disk image:

```sh
npm run desktop:dist
```
