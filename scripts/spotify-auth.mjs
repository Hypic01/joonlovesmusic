// One-time helper to mint a Spotify refresh token for the owner's account.
//
// This grants access to the owner's *personal* listening data (top tracks/artists,
// recently played, now playing) that the Client Credentials flow cannot reach.
//
// Prereqs / usage:
//   1. In the Spotify Developer Dashboard, add this exact redirect URI to your app:
//        http://127.0.0.1:8888/callback        (loopback IP — NOT "localhost")
//   2. Run:  node --env-file=.env.local scripts/spotify-auth.mjs
//   3. Open the printed URL, approve the scopes, then paste the printed
//      SPOTIFY_REFRESH_TOKEN=... line into .env.local (and your host env, e.g. Vercel).
//
// Re-run anytime to re-authorize. Nothing here ships to production.

import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["user-top-read", "user-read-recently-played", "user-read-currently-playing"];

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in the environment.");
  console.error("Run with:  node --env-file=.env.local scripts/spotify-auth.mjs");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES.join(" "),
    redirect_uri: REDIRECT_URI,
    state,
  }).toString();

async function exchangeCodeForToken(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end("Not found");
    return;
  }

  const authError = url.searchParams.get("error");
  if (authError) {
    res.writeHead(400).end(`Authorization failed: ${authError}`);
    console.error(`\nAuthorization failed: ${authError}`);
    server.close();
    process.exit(1);
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("State mismatch.");
    console.error("\nState mismatch — aborting.");
    server.close();
    process.exit(1);
  }

  try {
    const token = await exchangeCodeForToken(url.searchParams.get("code"));
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end("<h1>All set.</h1><p>You can close this tab and return to your terminal.</p>");
    console.log("\n✅ Success. Add this line to .env.local (and your host env):\n");
    console.log(`SPOTIFY_REFRESH_TOKEN=${token.refresh_token}\n`);
  } catch (err) {
    res.writeHead(500).end("Token exchange failed. See terminal.");
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this URL in your browser to authorize:\n");
  console.log(authorizeUrl + "\n");
  // Best-effort auto-open of the default browser.
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${opener} "${authorizeUrl}"`, () => {});
});
