import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two builds from one codebase:
//   npm run build      → dist/       single-file page for the Claude artifact
//   npm run build:web  → dist-web/   regular website (GitHub Pages): installable, works offline
const webHead = (): Plugin => ({
  name: 'web-head',
  transformIndexHtml: () => [
    { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'icon', type: 'image/png', href: './favicon.png' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './apple-touch-icon.png' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Évol' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }, injectTo: 'head' },
  ],
});

export default defineConfig(({ mode }) => {
  const web = mode === 'web';
  return {
    base: './',
    plugins: [react(), viteSingleFile(), ...(web ? [webHead()] : [])],
    publicDir: web ? 'public' : false,
    build: { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100000000, outDir: web ? 'dist-web' : 'dist' },
  };
});
