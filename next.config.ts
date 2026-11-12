import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/", destination: "/it", permanent: false },
      // An address without a language gets the Italian one, so it lands inside the site
      // layout (and its concept banner) whether the page exists or not.
      {
        source: "/:first((?!(?:it|en)(?:/|$)|_next|icon\\.svg|robots\\.txt|favicon\\.ico)[^/]+)/:rest*",
        destination: "/it/:first/:rest*",
        permanent: false,
      },
    ];
  },
  async headers() {
    // The concept must never be indexed as if it were the official site.
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
