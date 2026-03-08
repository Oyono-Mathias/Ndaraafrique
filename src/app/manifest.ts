import { MetadataRoute } from 'next'
 
/**
 * @fileOverview Manifeste PWA pour Ndara Afrique.
 * Définit le comportement de l'application une fois installée sur mobile.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ndara Afrique',
    short_name: 'Ndara',
    description: "L'excellence panafricaine par le savoir et la technologie.",
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#10b981',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
