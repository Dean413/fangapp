
import "server-only";
import type { PoolClient } from "pg";
import { dbPool } from "@/lib/db";
import { logError } from "@/lib/log";

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackErr) {
            logError("Rollback failed (connection likely already lost):", rollbackErr);
        }
        throw err;
    } finally {
        client.release();
    }
}