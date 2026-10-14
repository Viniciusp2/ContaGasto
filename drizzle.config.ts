import { defineConfig } from "drizzle-kit";

// Gera as migrations a partir do schema. Com DATABASE_URL aponta pro Neon (só pra studio/inspeção);
// pra aplicar, use `npm run db:migrate`, que serve pros dois.
export default process.env.DATABASE_URL
  ? defineConfig({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: process.env.DATABASE_URL },
    })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: process.env.PGLITE_DIR ?? "./.data/pglite" },
    });
