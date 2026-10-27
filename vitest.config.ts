import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: [
            { find: "server-only", replacement: path.resolve(__dirname, "tests/server-only-shim.ts") },
            { find: "next/headers", replacement: path.resolve(__dirname, "tests/shims/next-headers.ts") },
            { find: "next-intl/navigation", replacement: path.resolve(__dirname, "tests/shims/next-intl-navigation.ts") },
            { find: /^@\//, replacement: path.resolve(__dirname) + "/" },
        ],
    },
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        // All test files share one local Postgres database — run them one at a time.
        fileParallelism: false,
    },
});
