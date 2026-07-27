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

## Ollama AI broker (gaming PC on your LAN)

Rosa's work PC and the Hostinger website **do not** run AI locally. A separate **gaming PC** (RTX 5070 Ti) on your home network runs Ollama and serves Rosa's desktop app and the browser PWA. Private use only (Rosa + admin).

### On the gaming PC (one-time)

1. Install [Ollama](https://ollama.com) and pull a model, e.g. `ollama pull llama3.1:8b` or `qwen2.5:7b`.
2. Note the PC's **LAN IP** (e.g. `192.168.1.50`).
3. Allow network access and browser origins (PowerShell example):

```powershell
$env:OLLAMA_HOST="0.0.0.0"
$env:OLLAMA_ORIGINS="https://your-domain.com,http://localhost,http://127.0.0.1"
ollama serve
```

Add Rosa's desktop origin if needed. For dev you can use `OLLAMA_ORIGINS=*` on a trusted home LAN only.

Keep this PC awake on the network when Rosa uses Smart Paste or benefit suggestions.

### In Gaia (Rosa's desktop + website — same settings on each)

**Settings → Local AI:**

- Enable Local AI
- Backend: **Ollama (network / local)**
- **Ollama URL:** `http://192.168.1.50:11434` (gaming PC LAN IP — not `localhost` unless the app runs on that same machine)
- **Model:** e.g. `llama3.1:8b`

Tap **Test Connection**. Both Rosa's Electron app and the Hostinger site must be on a network that can reach the gaming PC (typically home Wi‑Fi/LAN). From outside the home network you would need VPN (e.g. Tailscale) — not configured in the app by default.

The desktop app can still use the **built-in bundled model** offline without the gaming PC; Smart Paste and shared Ollama features require the broker URL above.

## Etsy OAuth

Register the redirect URI for your deployed URL, e.g.:

`https://your-domain.com/studio/`

The app reads the page origin automatically (`getOAuthRedirectUri`).

## Desktop app

The packaged Electron app includes offline bundled AI and does not require Hostinger Basic Auth.

## Cloud sync (desktop ↔ website)

Rosa uses the **desktop app** day to day; the **Hostinger site** is the shared copy you can open to check things. Both stay aligned via a small PHP endpoint and the same JSON backup format as **Settings → Export backup**.

### One-time server setup

1. After `npm run build`, upload everything under `dist/` **including** `dist/sync/`.
2. On Hostinger, in `studio/sync/`, copy `config.php.example` → `config.php`.
3. Set a long random token in `config.php` (32+ characters). Do **not** commit this file.
4. Ensure `studio/sync/data/` exists and is writable by PHP (created automatically on first upload).
5. Confirm `studio/sync/data/.htaccess` is present so backup files are not browsable directly.

Test URL (adjust domain/path):

`https://your-domain.com/studio/sync/sync.php?meta=1`

With header `X-Gaia-Sync-Token: your-secret-token` you should get JSON like `{"exportedAt":null,"size":0}`.

### One-time app setup (each device)

In **Settings → Cloud sync (website)** on **both** the Electron app and the browser PWA:

1. Enable cloud sync.
2. **Sync URL:** `https://your-domain.com/studio/sync/sync.php`
3. **Sync token:** same value as in `config.php`.
4. Tap **Sync now** once (desktop usually uploads; empty browser pulls Rosa’s data).

### How it behaves

| Where | On startup |
|-------|------------|
| **Desktop** | If local data is newer → uploads silently. If cloud is newer → asks before downloading. |
| **Website** | If cloud is newer → asks before downloading. Otherwise uploads if local is newer. |

Manual controls: **Upload to cloud**, **Download from cloud**, **Sync now** (last-write-wins).

**Tips**

- Desktop is the normal source of truth; Rosa’s work auto-uploads when she opens the app.
- When you visit the site to verify, choose **Download from cloud** if prompted — do not upload from an empty test profile.
- Sync settings (URL/token) live in each device’s IndexedDB; enter them once per install.
- Large backups (images embedded as base64) can take a minute on slow connections.
