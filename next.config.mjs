
import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vous pouvez ajouter d'autres options de configuration Next.js ici si nécessaire
};
 
export default withNextIntl(nextConfig);
