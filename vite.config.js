import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest';
export default defineConfig({
    plugins: [react(), crx({ manifest })],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
            input: {
                offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
                history: resolve(__dirname, 'src/history/history.html'),
            },
        },
    },
    server: { port: 5173, strictPort: true, hmr: { port: 5174 } },
});
