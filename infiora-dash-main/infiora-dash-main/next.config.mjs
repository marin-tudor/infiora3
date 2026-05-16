/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.BASEPATH,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'infiora-bucket.s3.eu-north-1.amazonaws.com',
        pathname: '**'
      }
    ]
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/en/home',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(en|hr)',
        destination: '/:lang/home',
        permanent: true,
        locale: false
      },
      {
        source: '/:path((?!(?:api|_next|en|hr|front-pages|favicon.ico)(?:/|$)).*)',
        destination: '/en/:path',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
