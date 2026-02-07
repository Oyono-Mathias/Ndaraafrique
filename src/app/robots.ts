import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/student/', '/instructor/'],
    },
    sitemap: 'https://ndara-afrique.app/sitemap.xml',
  };
}
