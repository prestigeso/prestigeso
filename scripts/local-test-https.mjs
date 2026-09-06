import { readFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:https";

// Read-only TLS bridge for testing `next start` with its production CSP intact.
// Generate a short-lived localhost certificate outside version control, then:
// node scripts/local-test-https.mjs path/to/key.pem path/to/cert.pem
// PLAYWRIGHT_BASE_URL=https://127.0.0.1:3443 npx playwright test
const [keyFile, certFile] = process.argv.slice(2);
if (!keyFile || !certFile) {
  throw new Error("Usage: node scripts/local-test-https.mjs <key.pem> <cert.pem>");
}

const server = createServer({
  key: readFileSync(keyFile),
  cert: readFileSync(certFile),
}, (incoming, outgoing) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(incoming.method || "")) {
    outgoing.writeHead(405, { "Content-Type": "text/plain", Allow: "GET, HEAD, OPTIONS" });
    outgoing.end("Local browser checks are read-only.");
    return;
  }
  const upstream = request({
    hostname: "127.0.0.1",
    port: 3100,
    path: incoming.url,
    method: incoming.method,
    headers: { ...incoming.headers, "x-forwarded-proto": "https" },
  }, (response) => {
    outgoing.writeHead(response.statusCode || 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end("Local Next.js server is unavailable.");
  });
  incoming.pipe(upstream);
});
server.listen(3443, "127.0.0.1", () => {
  console.log("Read-only HTTPS test bridge: https://127.0.0.1:3443 -> http://127.0.0.1:3100");
});
