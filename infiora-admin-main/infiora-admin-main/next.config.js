const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('[env] NEXT_PUBLIC_API_URL is required for infiora-admin-main.');
}

const apiHost = new URL(apiUrl).hostname;
const allowedImageHosts = [
  'infiora-bucket.s3.eu-north-1.amazonaws.com',
  'diesmartekarte-bucket.s3.eu-north-1.amazonaws.com',
  apiHost,
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [...new Set(allowedImageHosts)],
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
