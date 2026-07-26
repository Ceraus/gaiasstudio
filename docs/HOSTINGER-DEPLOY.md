# Deploying Gaia's Studio on Hostinger

## Build & upload

```bash
npm run build
```

Upload the contents of `dist/` to your Hostinger site (e.g. `public_html/studio/`).

Copy `public/.htaccess.example` to `.htaccess` in the same folder for SPA routing.

## Recommended security layers

1. **HTTP Basic Auth** (Hostinger `.htaccess`) — blocks casual visitors before the app loads. See `.htaccess.example`.
2. **App PIN** — created on first launch; encrypts API keys in IndexedDB.
3. **Cloudflare Access** (optional) — email OTP in front of your domain; no app changes.

## Ollama on Rosa's PC (local AI)

The browser app calls Ollama directly from Rosa's machine — not through Hostinger.

On the PC running Ollama:

```bash
set OLLAMA_ORIGINS=https://your-domain.com
ollama serve
```

In Settings → Local AI:

- Backend: **Ollama (network / local)**
- URL: `http://localhost:11434`
- Model: e.g. `llama3.2`

If **Test Connection** fails, check browser console for CSP or CORS errors. LAN Ollama may need your server IP in `OLLAMA_ORIGINS`.

## Etsy OAuth

Register the redirect URI for your deployed URL, e.g.:

`https://your-domain.com/studio/`

The app reads the page origin automatically (`getOAuthRedirectUri`).

## Desktop app

The packaged Electron app includes offline bundled AI and does not require Hostinger Basic Auth.
