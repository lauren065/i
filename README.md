# cheolm.in

Personal site + music studio.

- `/` — minimal landing (click image → plays)
- `/studio` — HLS streaming music library (42 tracks across Disc 1–3, Pure WInter, Singles)

## Stack

- Next.js 14 (pages router + app dir)
- hls.js client-side player
- Audio: AAC 192kbps HLS on AWS S3 (private) + CloudFront (CDN)
- Signed URLs: CloudFront RSA keypair, per-track wildcard policy, 600s TTL

## Deploy

Runs on Lightsail (Seoul), PM2 process `cheolm` on port 3000, nginx at cheolm.in.

```bash
npm install
npm run build
npm run start
```

Required env vars (see `.env.example`):

- `CF_DOMAIN` — e.g. `audio.cheolm.in`
- `CF_KEY_PAIR_ID` — CloudFront public key ID
- `CF_PRIVATE_KEY` — RSA private key (escape newlines as `\n`)

## Audio pipeline

1. Source WAV/MP3 kept off-repo and backed up separately
2. Transcode to HLS with ffmpeg (AAC 192kbps, 10s segments)
3. Upload segments to `s3://cheolm-media/studio/<section>/<slug>/`
4. m3u8 manifests committed under `lib/hls/` for server-side signing
5. Client fetches `/api/manifest/<section>/<slug>` — returns m3u8 with signed segment URLs valid for 10min
