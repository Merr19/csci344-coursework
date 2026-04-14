import { defineConfig } from "vite";
import { appendProxyUrl } from "./vite.plugins";

const proxyUrl = "https://photo-app-secured.herokuapp.com/api";

export default defineConfig({
    base: "",
    server: {
        proxy: {
            // Route API requests to the proxy
            "/api": {
                target: proxyUrl,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    plugins: [appendProxyUrl(proxyUrl)],
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
