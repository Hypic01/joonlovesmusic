# joonlovesmusic

joon rates all the musics



## Music Map

A world map at `/map` ties rated songs to real-world places. Admin-only editing at
`/admin/map` and from the song add/edit forms. Backed by the `map_pins` Supabase table.

Required env vars (in `.env.local`):

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — browser Maps key (restrict by HTTP referrer + to Maps JavaScript API + Places API)
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — a Vector Map ID (required for the pin markers to render)

## Spotify Stats

`/spotify-stats` ("joon's spotify stats") shows the owner's live Spotify listening —
top tracks & top artists across three time ranges, recently played, and a now-playing
banner — cross-linked to rated songs. It's the one server-rendered page; it reads the
owner's account via a stored refresh token, so that token never reaches the browser.

Required env vars (in `.env.local`):

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — Spotify app credentials (also used by the `/api/spotify` catalog lookups)
- `SPOTIFY_REFRESH_TOKEN` — long-lived user token for the owner's account (see below)

### Minting the refresh token (one-time)

1. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), open your app's settings and add the redirect URI `http://127.0.0.1:8888/callback` (the loopback IP, **not** `localhost`).
2. Run the helper: `node --env-file=.env.local scripts/spotify-auth.mjs`
3. Open the printed URL, approve the scopes (`user-top-read`, `user-read-recently-played`, `user-read-currently-playing`), then paste the printed `SPOTIFY_REFRESH_TOKEN=...` line into `.env.local` (and your host env, e.g. Vercel).

Re-run the script anytime to re-authorize. If `SPOTIFY_REFRESH_TOKEN` is absent, the page renders a graceful "warming up" notice instead of erroring.
