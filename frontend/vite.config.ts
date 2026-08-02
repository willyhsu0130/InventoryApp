import tailwindcss from '@tailwindcss/vite';
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    // Pass '' to load all variables from .env regardless of prefix
    return {
        plugins: [react(), tailwindcss()],
    };
});