import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "bcryptjs", "nodemailer"],
  images: {
    // Images are resized ahead of time (scripts/optimize-images.mjs and src/lib/upload.ts), not per request:
    // resizing on demand overloaded the small server and made photos fail to load.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    imageSizes: [128, 256, 384],
    deviceSizes: [640, 960, 1280, 1920],
  },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Let browsers keep photos and the logo instead of downloading them on every visit.
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
    ];
  },
};

export default withNextIntl(config);
