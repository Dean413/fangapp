// app/lib/db.ts
// One shared Postgres pool for the FangWriters database (kept on globalThis so hot reloads don't open new pools)
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { fangDb?: Pool };

export const db =
    globalForDb.fangDb ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
        max: 10,
    });

if (process.env.NODE_ENV !== "production") globalForDb.fangDb = db;

// Older name, still used by lib/stories.ts, lib/users.ts and some API routes
export const dbPool = db;
