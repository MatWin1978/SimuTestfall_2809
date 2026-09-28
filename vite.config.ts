import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

// prototypeBase: "https://xr-experiences.dev.queo-group.com/ph-ludwigsburg/";
// base: 'https://xr-experiences.dev.queo-group.com/ph-ludwigsburg/',

// https://vite.dev/config/
export default defineConfig({
    base: './',
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-three': ['three', 'postprocessing', 'n8ao'],
                    'vendor-motion': ['motion'],
                },
            },
        },
    },
})
