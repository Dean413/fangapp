// Runs before every test file. Points the app's DATABASE_URL at the local test database and
// refuses to run if that isn't clearly a local DB — these tests call real money code against it.
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.local) — refusing to run money-code tests without it.");
}

const host = new URL(testUrl).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`TEST_DATABASE_URL must point at localhost, got host "${host}". Refusing to run against it.`);
}
if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must not be the same as DATABASE_URL (the shared production database).");
}

process.env.DATABASE_URL = testUrl;
