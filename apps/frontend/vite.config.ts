import tailwindcss from '@tailwindcss/vite';
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => {
    // Pass '' to load all variables from .env regardless of prefix

    const testEnv = loadEnv("test", path.resolve(__dirname, "../../"), "");

    return {
        plugins: [react(), tailwindcss()],
        test: {
            globals: true,
            environment: "jsdom",
            setupFiles: "./src/test/setup.ts",
            reporters: ["default", "html"],
            outputFile: "./html-report/index.html",
            env: testEnv, // Injects SUPA
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
    };
});