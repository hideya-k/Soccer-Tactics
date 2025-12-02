import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ↓ ここが一番重要です！前後のスラッシュ / も忘れずに。
  base: "/Soccer-Tactics/",
})
