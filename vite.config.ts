import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Custom plugin to copy manifest.json and assets to dist/
const copyExtensionAssets = () => {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const assetsDir = resolve(distDir, 'assets');
      
      // Ensure dist and dist/assets directories exist
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Copy manifest.json
      if (fs.existsSync(resolve(__dirname, 'manifest.json'))) {
        fs.copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(distDir, 'manifest.json')
        );
      } else if (fs.existsSync(resolve(__dirname, 'src/manifest.json'))) {
        fs.copyFileSync(
          resolve(__dirname, 'src/manifest.json'),
          resolve(distDir, 'manifest.json')
        );
      }

      // Copy assets folder if it exists
      const srcAssets = resolve(__dirname, 'src/assets');
      if (fs.existsSync(srcAssets)) {
        const files = fs.readdirSync(srcAssets);
        for (const file of files) {
          fs.copyFileSync(
            resolve(srcAssets, file),
            resolve(assetsDir, file)
          );
        }
      }

      // Copy popup.html if it exists
      if (fs.existsSync(resolve(__dirname, 'src/popup/popup.html'))) {
        fs.copyFileSync(
          resolve(__dirname, 'src/popup/popup.html'),
          resolve(distDir, 'popup.html')
        );
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react(), copyExtensionAssets()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, './src/shared'),
        '@background': resolve(__dirname, './src/background'),
        '@content': resolve(__dirname, './src/content'),
        '@sidebar': resolve(__dirname, './src/sidebar'),
        '@popup': resolve(__dirname, './src/popup'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: isDev,
      minify: !isDev,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/main.tsx'),
          sidebar: resolve(__dirname, 'src/sidebar/main.tsx'),
          background: resolve(__dirname, 'src/background/index.ts'),
          content: resolve(__dirname, 'src/content/index.ts'),
          'clip-content': resolve(__dirname, 'src/content/clip-content.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // Keep extension entry points with clean, static names
            if (['background', 'content', 'clip-content', 'sidebar', 'popup'].includes(chunkInfo.name)) {
              return '[name].js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              // Extract base name to match input
              const baseName = assetInfo.name.replace(/\.css$/, '');
              if (['sidebar', 'popup'].includes(baseName)) {
                return '[name].css';
              }
            }
            return 'assets/[name]-[hash].[ext]';
          },
        },
      },
    },
    test: {
      exclude: ['**/tests/e2e/**', '**/node_modules/**', '**/dist/**'],
    },
  };
});
