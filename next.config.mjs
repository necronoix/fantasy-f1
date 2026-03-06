/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.formula1.com' },
      { protocol: 'https', hostname: '*.formula1.com' },
    ],
  },
}

export default nextConfig
