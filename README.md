# TTS Project

A school project: a web app where registered users turn text into speech using the ElevenLabs API, with an administrator dashboard for the professor.

## Current status: Phase 3 (admin dashboard) in review

Done in Phase 1:
- Supabase database: `profiles` and `tts_requests` tables, signup trigger, Row Level Security
- Register, log in, log out
- Protected `app.html` (redirects to login when not signed in)
- Disabled accounts are signed out immediately with a message

Done in Phase 2:
- Edge Function `generate-speech` (the only code that talks to ElevenLabs)
- `app.html`: language and voice selection, text box with counter, Generate, player (Play, Pause, Resume, Stop, volume), MP3 download, Clear, and your own history
- Limits enforced on the server: 1,000 characters per request and 20 successful generations per user per UTC day

Done in Phase 3:
- `admin.html`: admin dashboard with statistics (total users, total generations, generations today (UTC), total characters, failed generations), a list of registered users with Enable/Disable buttons, and the latest 100 TTS records from all users (with a "View text" toggle)
- Only admins can open it; normal users are sent back to `app.html`, and visitors who are not logged in are sent to the login page

Not built yet (later phases): appearance settings (dark mode, font size/type), deployment.

## Technology

| Part | Choice |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript (no build step) |
| Auth + database | Supabase (Auth + PostgreSQL + Row Level Security) |
| Client library | `supabase-js`, loaded from a CDN `<script>` tag |
| Text-to-speech | ElevenLabs (`eleven_multilingual_v2`), called only from one Supabase Edge Function |

## How it works now

```
Browser (web/*.html + js/)  --supabase-js-->  Supabase Auth  (login, session)
                            --supabase-js-->  PostgreSQL     (profiles, history; protected by RLS)
                            --fetch + login token-->  Edge Function generate-speech
                                                        --> ElevenLabs API  (key kept as a Supabase secret)
                                                        <-- MP3, returned to the browser (never stored)
```

### Languages and voices
One approved voice per language (English, Filipino, Spanish, Japanese, Chinese). The list is in `web/js/config.js` (for the dropdowns) and again in `supabase/functions/generate-speech/index.ts` (the server validates it and does not trust the browser). To change a voice, edit both files and redeploy the function. Text is spoken as typed; nothing is translated.

### Audio is not stored
The browser plays and downloads a temporary copy. History keeps text and details only, so old audio cannot be replayed after a reload; generate it again.

## Database

- `profiles`: one row per user (`id`, `email`, `role` = `user`/`admin`, `is_disabled`, `created_at`). Created automatically by a trigger when someone registers.
- `tts_requests`: one row per speech generation (`user_id`, `text`, `char_count`, `voice_name`, `language_code`, `status`, `error_message`, `created_at`). Written only by the Edge Function; failed generations are logged with `status = 'error'` and do not count toward the daily limit.

Security rules (RLS), in plain words:
- A user can read only their own profile and their own `tts_requests`.
- An admin can read everyone's profiles and requests, and can enable/disable other users.
- Nobody can change a `role` from the browser. The browser can never insert, update or delete `tts_requests`; only the server will.
- Admin dashboard: an admin can enable/disable normal users (`role = 'user'`) only. Admins cannot disable themselves or other admins, and nobody can change a role from the browser.
- The first admin is set manually by the project owner in the Supabase SQL Editor:
  `update public.profiles set role = 'admin' where email = 'you@example.com';`

The SQL lives in `supabase/migrations/`.

## Local setup

1. In Supabase (Authentication settings), email confirmation is turned **off** for development.
2. Put your project URL and publishable (anon) key in `web/js/config.js`. Never put a service-role key or the ElevenLabs key in `web/`.
3. Serve the `web/` folder and open it in a browser:
   ```bash
   cd web
   python3 -m http.server 8000
   ```
   Then visit http://localhost:8000
4. Register an account, log in, and you should land on `app.html`.

### Edge Function
- The ElevenLabs key is a Supabase secret named `ELEVENLABS_API_KEY`. Never put it in `web/` or Git. Set it with `supabase secrets set ELEVENLABS_API_KEY=...` or in the Supabase dashboard (Edge Functions, Secrets).
- Deploy with `supabase functions deploy generate-speech` (Supabase CLI), or from the dashboard.
- The function only accepts browsers from the addresses in `ALLOWED_ORIGINS` at the top of `index.ts` (`http://localhost:8000` and the GitHub Pages address). Add your real site address there before deploying the site.

## Folder structure

```
README.md
docs/                      project documents
web/
  index.html               login
  register.html            registration
  app.html                 protected page: text-to-speech, player, history
  admin.html               admin dashboard (admins only)
  css/style.css
  js/config.js             public Supabase URL + key
  js/supabaseClient.js
  js/auth.js               register / login / logout / page protection
  js/tts.js                language/voice, generate, player, download, history
  js/admin.js              admin statistics, users, all history
supabase/
  migrations/              database SQL
  functions/generate-speech/index.ts   the Edge Function
```
