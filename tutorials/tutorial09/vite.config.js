import { defineConfig } from "vite";

export default defineConfig({
  base: "",
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "main.js",
        assetFileNames: "main.css",
        chunkFileNames: "chunk.js",
        manualChunks: undefined,
      },
    },
  },
});