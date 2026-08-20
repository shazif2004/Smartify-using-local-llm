import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative assets are required when the production UI is loaded from the
  // signed desktop application's file bundle.
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
  ],
});
