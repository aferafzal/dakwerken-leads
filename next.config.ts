import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // De stadspagina's en het oude offerteformulier zijn weg:
      // oude links en zoekresultaten gaan permanent naar de homepage.
      { source: '/:stad(dakwerken-[a-z-]+)', destination: '/', permanent: true },
      { source: '/bedankt', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
