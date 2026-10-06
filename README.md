# TTS Project

A school project: a web app where registered users turn text into speech using Google Cloud Text-to-Speech, with an administrator dashboard for the professor.

## Current status: Phase 1 (database + authentication)

Done in Phase 1:
- Supabase database: `profiles` and `tts_requests` tables, signup trigger, Row Level Security
- Register, log in, log out
- Protected `app.html` (redirects to login when not signed in)
- Disabled accounts are signed out immediately with a message

Not built yet (later phases): text-to-speech, audio player/download, history page, admin dashboard, appearance settings, deployment.

## Technology

| Part | Choice |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript (no build step) |
| Auth + database | Supabase (Auth + PostgreSQL + Row Level Security) |
| Client library | `supabase-js`, loaded from a CDN `<script>` tag |
| Text-to-speech (later) | Google Cloud TTS, called from one Supabase Edge Function |

## How it works now

```
Browser (web/*.html + js/)  --supabase-js-->  Supabase Auth  (login, session)
                            --supabase-js-->  PostgreSQL     (profiles, protected by RLS)
```

## Database

- `profiles`: one row per user (`id`, `email`, `role` = `user`/`admin`, `is_disabled`, `created_at`). Created automatically by a trigger when someone registers.
- `tts_requests`: one row per speech generation (`user_id`, `text`, `char_count`, `voice_name`, `language_code`, `status`, `error_message`, `created_at`). Unused until Phase 2.

Security rules (RLS), in plain words:
- A user can read only their own profile and their own `tts_requests`.
- An admin can read everyone's profiles and requests, and can enable/disable other users.
- Nobody can change a `role` from the browser. The browser can never insert, update or delete `tts_requests`; only the server will.
- The first admin is set manually by the project owner in the Supabase SQL Editor:
  `update public.profiles set role = 'admin' where email = 'you@example.com';`

The SQL lives in `supabase/migrations/`.

## Local setup

1. In Supabase (Authentication settings), email confirmation is turned **off** for development.
2. Put your project URL and publishable (anon) key in `web/js/config.js`. Never put a service-role key or any Google credential in `web/`.
3. Serve the `web/` folder and open it in a browser:
   ```bash
   cd web
   python3 -m http.server 8000
   ```
   Then visit http://localhost:8000
4. Register an account, log in, and you should land on `app.html`.

## Folder structure

```
README.md
docs/                      project documents
web/
  index.html               login
  register.html            registration
  app.html                 protected page (placeholder in Phase 1)
  css/style.css
  js/config.js             public Supabase URL + key
  js/supabaseClient.js
  js/auth.js               register / login / logout / page protection
supabase/migrations/       database SQL
```
