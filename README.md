# joonlovesmusic

joon rates all the musics



## Music Map

A world map at `/map` ties rated songs to real-world places. Admin-only editing at
`/admin/map` and from the song add/edit forms. Backed by the `map_pins` Supabase table.

Required env vars (in `.env.local`):

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — browser Maps key (restrict by HTTP referrer + to Maps JavaScript API + Places API)
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — a Vector Map ID (required for the pin markers to render)
