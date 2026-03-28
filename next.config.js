/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    if (Array.isArray(config.externals)) {
      config.externals.push({
        '@deepgram/sdk': 'commonjs @deepgram/sdk',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
