import { MetadataRoute } from 'next';
import { getAdminDb } from '@/firebase/admin';

/**
 * @fileOverview Manifeste PWA dynamique pour Ndara Afrique.
 * ✅ CEO FEATURE : Les réglages sont pilotés depuis le panneau Admin.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let appName = 'Ndara Afrique';
  let shortName = 'Ndara';
  let iconUrl = '/logo.png';
  let description = "L'excellence panafricaine par le savoir et la technologie.";

  try {
    const db = getAdminDb();
    const settingsDoc = await db.collection('settings').doc('global').get();
    
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      appName = data?.pwa?.appName || data?.general?.siteName || appName;
      shortName = data?.pwa?.shortName || shortName;
      iconUrl = data?.pwa?.iconUrl || iconUrl;
      description = data?.pwa?.appDescription || description;
    }
  } catch (e) {
    console.warn("PWA Manifest dynamic fetch failed, using defaults.");
  }

  return {
    name: appName,
    short_name: shortName,
    description: description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#10b981',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
