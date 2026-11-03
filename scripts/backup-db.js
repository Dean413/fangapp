// Full production DB backup: schema + data + constraints + indexes + sequences, custom format
// (restorable with pg_restore, and selectively restorable per-table/object).
//
// Usage:  node scripts/backup-db.js
// Reads DATABASE_URL from .env.production. Output goes to Desktop/FANGDBBACKUP/fang_backup_<date>.dump
//
// Restore example:
//   pg_restore --no-owner --no-privileges -d <target_database_url> fang_backup_2026-11-02_143000.dump

const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.production") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("DATABASE_URL not found in .env.production");
    process.exit(1);
}

const outDir = path.join(os.homedir(), "Desktop", "FANGDBBACKUP");
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19); // e.g. 2026-11-02-17-43-05
const outFile = path.join(outDir, `fang_backup_${stamp}.dump`);

// -Fc: custom format (compressed, restorable selectively with pg_restore). Includes schema,
// data, constraints, indexes, sequences, triggers, views, functions — everything pg_dump covers
// for the database/role doing the dump. --no-owner/--no-privileges so it restores cleanly into
// any target role without needing the original RDS master role to exist there.
const pgDumpCandidates = [
    "pg_dump",
    "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
];

let result = null;
for (const bin of pgDumpCandidates) {
    result = spawnSync(bin, ["--dbname=" + dbUrl, "-Fc", "--no-owner", "--no-privileges", "-f", outFile], {
        stdio: ["ignore", "inherit", "inherit"],
    });
    if (!result.error) break;
}

if (!result || result.error || result.status !== 0) {
    console.error("pg_dump failed:", result && (result.error || `exit code ${result.status}`));
    process.exit(1);
}

console.log(`Backup saved: ${outFile}`);
