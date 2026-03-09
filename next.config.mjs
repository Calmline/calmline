/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // Reduce watch handle pressure (EMFILE) so app routes compile reliably in dev.
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/realtime-gateway/**",
          "**/.cursor/**",
          "**/agent-transcripts/**",
          "**/terminals/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
