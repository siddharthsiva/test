import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SmokeSmart East Bay',
        short_name: 'SmokeSmart',
        description: 'Hyper-local wildfire & air quality decision support for Contra Costa schools',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            // SVG only for now — see README PWA section for why, and what
            // to add before final submission for best cross-device support.
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell; API calls (PurpleAir/AirNow/FIRMS/Open-Meteo)
        // are intentionally NOT cached — this is a real-time safety tool,
        // stale air-quality data would be actively misleading.
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
})
