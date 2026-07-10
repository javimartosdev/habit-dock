import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const useSsl =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

const client = postgres(connectionString, {
  prepare: false,
  ...(useSsl ? { ssl: "require" as const } : {}),
});

export const db = drizzle(client, { schema });
