# ClearPlan Deployment Notes

## Temporary Demo Auth

ClearPlan currently uses `TEMP_DEMO_AUTH`, a frontend-only demo login gate, while backend Microsoft SSO is paused for Dokploy separation.

Frontend static hosting:

- Deploy the full `dist/` directory to `https://clearplan.clearviewglobal.net/`.
- No backend auth URL is required for the temporary demo gate.
- Do not add Microsoft client secrets or backend secrets to Vite env files.

Demo auth behavior:

- Correct demo credentials store only a `clearplan_TEMP_DEMO_AUTH_session` flag in `localStorage`.
- Logout clears the flag and returns to `/login`.
- This is not production security. It only hides the app UI for demos.

Future Laravel Microsoft SSO, when resumed, should provide:

- `GET /auth/microsoft/redirect`
- `GET /auth/microsoft/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

The future callback must validate the Microsoft token, tenant/domain or email allowlist, create or update the internal user record, and issue a secure HttpOnly session cookie. Persistent login should use Laravel session/remember-me controls, not permanent frontend tokens.

## PDF Assets

PDF floor plan rendering requires `dist/pdfjs/` in production. Upload the complete `dist/` output, including:

- `/pdfjs/pdf.worker.min.js`
- `/pdfjs/cmaps/`
- `/pdfjs/standard_fonts/`
- `/pdfjs/wasm/`

On A2Hosting, verify `.js` files are served as JavaScript and `.wasm` files are served as `application/wasm`.

## PWA Build

Run `npm run build` before deploying. The production output includes:

- `/manifest.webmanifest`
- `/sw.js`
- `/offline.html`
- `/assets/icons/`
- `/pdfjs/`

The service worker precaches the app shell, serves an offline fallback for navigation, caches static assets, and uses network-first caching for same-origin `/api/` GET requests.

## Capacitor iOS

Repository-level setup is configured in `capacitor.config.ts`.

Native source assets live in:

- `resources/icon.png`
- `resources/splash.png`

Commands:

- `npm run assets:generate`
- `npm run cap:add:ios`
- `npm run cap:sync`
- `npm run cap:open:ios`

Local iOS tooling still needs CocoaPods or a working Capacitor iOS package manager environment before `cap add ios` can create the Xcode project. On this machine, Capacitor 7.6.7 is installed, but `pod` is not available on `PATH`, so iOS project generation and Xcode sync are blocked until CocoaPods is installed through a modern Ruby/Homebrew setup.

Before App Store submission, set the final Apple Team ID and production domains in Xcode:

- Bundle ID: `com.clearviewglobal.clearplan`
- Associated Domains: `applinks:<production-domain>`
- URL Scheme: `clearplan`
- Signing team and provisioning profiles
- Camera/photo/file permissions if native upload capture is enabled
