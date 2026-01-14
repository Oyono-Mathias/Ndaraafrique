/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'upload.wikimedia.org',
          port: '',
          pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'images.unsplash.com',
            port: '',
            pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'picsum.photos',
            port: '',
            pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'api.dicebear.com',
            port: '',
            pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'www.gstatic.com',
            port: '',
            pathname: '/**',
        },
        {
            protocol: 'https',
            hostname: 'i.postimg.cc',
            port: '',
            pathname: '/**',
        }
      ],
    },
};

export default nextConfig;
