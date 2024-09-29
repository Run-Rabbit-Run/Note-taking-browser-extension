import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from "vite-plugin-svgr";
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), svgr()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                background: resolve(__dirname, 'src/scripts/background.ts'),
                contentScript: resolve(__dirname, 'src/scripts/contentScript.ts'),
            },
            output: {
                entryFileNames: '[name].js',
            }
        },
        outDir: 'dist',
    }
});
