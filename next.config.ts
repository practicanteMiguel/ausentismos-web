import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (vía jwks-rsa -> jose) rompe al empaquetarse con Turbopack para funciones
  // serverless (jose resuelve el build ESM-only en vez del build CJS de Node). Se excluye del
  // bundle para que Node lo resuelva de forma nativa en tiempo de ejecución.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
