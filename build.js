import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

// 1. Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

const sharedConfig = {
  configFile: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [react()],
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
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
  }
};

const targets = [
  {
    name: 'background',
    entry: resolve(__dirname, 'src/background/index.ts'),
  },
  {
    name: 'content',
    entry: resolve(__dirname, 'src/content/index.ts'),
  },
  {
    name: 'clip-content',
    entry: resolve(__dirname, 'src/content/clip-content.ts'),
  },
  {
    name: 'sidebar',
    entry: resolve(__dirname, 'src/sidebar/main.tsx'),
  },
  {
    name: 'popup',
    entry: resolve(__dirname, 'src/popup/main.tsx'),
  }
];

async function runBuilds() {
  for (const target of targets) {
    console.log(`Building target: ${target.name}...`);
    await build({
      ...sharedConfig,
      build: {
        ...sharedConfig.build,
        lib: {
          entry: target.entry,
          formats: ['iife'],
          name: target.name.replace(/-/g, '_'),
          fileName: () => `${target.name}.js`,
        },
        rollupOptions: {
          output: {
            extend: true,
            globals: {
              // No externals, bundle everything in
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                return `${target.name}.css`;
              }
              return 'assets/[name]-[hash].[ext]';
            },
          }
        }
      }
    });
  }

  // Copy manifest.json, popup.html, icons
  console.log('Copying static assets...');
  
  // manifest.json
  const manifestSrc = fs.existsSync(resolve(__dirname, 'manifest.json')) 
    ? resolve(__dirname, 'manifest.json') 
    : resolve(__dirname, 'src/manifest.json');
  fs.copyFileSync(manifestSrc, resolve(distDir, 'manifest.json'));

  // popup.html
  if (fs.existsSync(resolve(__dirname, 'src/popup/popup.html'))) {
    fs.copyFileSync(resolve(__dirname, 'src/popup/popup.html'), resolve(distDir, 'popup.html'));
  }

  // assets folder (icons)
  const assetsSrc = resolve(__dirname, 'src/assets');
  const assetsDist = resolve(distDir, 'assets');
  if (!fs.existsSync(assetsDist)) {
    fs.mkdirSync(assetsDist, { recursive: true });
  }
  if (fs.existsSync(assetsSrc)) {
    const files = fs.readdirSync(assetsSrc);
    for (const file of files) {
      fs.copyFileSync(resolve(assetsSrc, file), resolve(assetsDist, file));
    }
  }
  console.log('Build complete!');
}

runBuilds().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
