/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/AILodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/ailodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/ai-lodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/Events",
        destination: "/Curriculum",
        permanent: true,
      },
      {
        source: "/WhatWeDo",
        destination: "/Curriculum",
        permanent: true,
      },
      {
        source: "/Datathon",
        destination: "/Curriculum",
        permanent: true,
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    // Vercel bills a transformation + cache write on every image cache MISS
    // *and* STALE. Effective TTL is max(upstream Cache-Control max-age,
    // minimumCacheTTL). Files in public/ aren't content-hashed so they get no
    // long-lived max-age, which left them falling back to the 3600s default —
    // i.e. every variant of the nav logo, footer logo and hero images was
    // re-transformed up to 720x/month. 7 days puts that at ~4x/month while
    // keeping redeploys of static art visible within a week.
    // (Blob-hosted images were already fine: Blob serves ~1 month max-age.)
    minimumCacheTTL: 604800,

    // Defaults are 8 device widths (up to 3840) x 8 image widths; every width a
    // browser actually requests is a separately billed variant. These lists
    // cover every `sizes` prop in the app without generating the long tail.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [48, 64, 96, 200, 400],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "ssvs8thfuktvqsqk.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "qhh4bvxlfvehohvd.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "thisisformygif.s3.ap-southeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
