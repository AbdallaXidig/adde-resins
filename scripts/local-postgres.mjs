// Runs a real PostgreSQL server for local development without installing anything system-wide.
// Data lives in ./.pgdata (gitignored). Production uses a managed PostgreSQL via DATABASE_URL.
import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = path.resolve(".pgdata");
const initialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "adde",
  password: "adde_local_dev",
  port: 5433,
  persistent: true,
});

if (!initialised) await pg.initialise();
await pg.start();
if (!initialised) await pg.createDatabase("adde_resins");

console.log("Local PostgreSQL ready on port 5433 (database: adde_resins). Press Ctrl+C to stop.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
