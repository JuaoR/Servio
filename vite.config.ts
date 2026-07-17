import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

export default defineConfig(({ mode }) => {
  // Read .env file directly to avoid system environment overriding it if it's a placeholder
  let envConfig: Record<string, string> = {};
  if (fs.existsSync('.env')) {
    envConfig = dotenv.parse(fs.readFileSync('.env'));
  }
  
  const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jnkqqehpegqvzlsjrsqk.supabase.co';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: supabaseUrl && !supabaseUrl.includes('seu-projeto') ? {
        '/supabase-proxy': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-proxy/, '')
        }
      } : undefined
    },
  };
});
