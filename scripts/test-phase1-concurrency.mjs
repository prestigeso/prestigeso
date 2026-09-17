// Only uniquely owned synthetic visitors in a previously created local test database.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const database = process.env.PHASE1_TEST_DATABASE || "";
if (process.env.PHASE0_DB_TESTS !== "1" || !/^prestigeso_phase0_(fresh|legacy|restored)_\d{17}$/.test(database)) throw new Error("Explicit isolated synthetic test database required");
const sql = (text) => new Promise((ok, fail) => {
  const child = execFile(resolve("tmp/phase0-postgres/runtime/pgsql/bin/psql.exe"), ["-h","127.0.0.1","-p","55432","-U","postgres","-d",database,"-X","-qAt","-v","ON_ERROR_STOP=1","-f","-"], { timeout: 15000, env: { ...process.env, PGCLIENTENCODING: "UTF8" } }, (error, stdout, stderr) => error ? fail(new Error(stderr)) : ok(stdout.trim()));
  child.stdin.end(text);
});
const visitor = randomUUID(), eventId = randomUUID();
try {
  const open = `select analytics_open_session('${visitor}','home','direct','android','normal')`;
  const ids = await Promise.all([sql(open), sql(open)]);
  assert.equal(ids[0], ids[1]);
  console.log("PASS concurrent tabs share one server session");
  const event = JSON.stringify([{ version: 1, eventId, visitorId: visitor, sessionId: ids[0], sequence: 1, type: "page_view", page: "home" }]);
  const ingest = `select analytics_ingest('${visitor}','${event}'::jsonb)`;
  const counts = await Promise.all([sql(ingest), sql(ingest)]);
  assert.equal(counts.reduce((sum, n) => sum + Number(n), 0), 1);
  console.log("PASS concurrent event retry is stored exactly once");
  await Promise.allSettled([sql(ingest), sql(`select analytics_revoke('${visitor}')`)]);
  assert.equal(await sql(`select count(*) from analytics_events where visitor_id='${visitor}'`), "0");
  await assert.rejects(sql(open), /CONSENT_REVOKED/);
  console.log("PASS revocation wins over concurrent event and prevents stale reopen");
} finally {
  await sql(`delete from analytics_visitors where id='${visitor}'`);
}
