const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error('[env] NEXT_PUBLIC_API_URL is required for infiora-app-main.');
}

const parsedApiUrl = new URL(apiUrl);
const allowedImageHosts = Array.from(
  new Set(
    [
      parsedApiUrl.hostname,
      ...(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS || '')
        .split(',')
        .map(host => host.trim())
        .filter(Boolean),
    ],
  ),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: allowedImageHosts.flatMap(hostname => ([
      { protocol: 'https', hostname, pathname: '/**' },
      { protocol: 'http', hostname, pathname: '/**' },
    ])),
  },
};

export default nextConfig;
