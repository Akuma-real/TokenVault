import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const noStoreNoIndex = [
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex" },
    ];

    return [
      { source: "/s/:path*", headers: noStoreNoIndex },
      { source: "/api/share", headers: noStoreNoIndex },
      { source: "/api/share/:path*", headers: noStoreNoIndex },
    ];
  },
};

export default nextConfig;
