import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * next dev en next build delen standaard dezelfde .next-map en overschrijven
   * elkaars staat: een build naast een draaiende dev-server levert 404's op
   * pagina's die prima bestaan. Met deze variabele kan een build in een eigen
   * map, zonder de dev-server te storen.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "esgbekvcennqvskhbxfv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
