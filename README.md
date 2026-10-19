# Sonara Voice

**Sonara Voice** is a text-to-speech web app built as a school project ("Design and Implementation of a Text to Speech/Audio System"). Registered users type text, choose a language and a voice, and listen to the result or download it as an MP3 file. An administrator dashboard lets the administrator see usage and manage user accounts.

Live site: https://fangyuan143777-spec.github.io/tts-project/

## Features

### For users
- Register, log in and log out (email and password).
- Type up to 1,000 characters, with a live character and word counter.
- Choose one of **nine languages**, then one of its voices:

  | Language | Voices |
  |---|---|
  | English | 4 |
  | Filipino, Spanish, Japanese, Chinese, French, German, Portuguese (Brazil), Italian | 3 each |

  The first voice of each language is selected by default. The text is spoken exactly as typed; nothing is translated.
- Playback controls: **Play, Pause, Resume, Stop** and a volume slider.
- **Download MP3** (the file is saved as `speech.mp3`).
- **History:** your own 20 most recent requests (time, language, voice, characters, status and a short preview of the text).
- **Appearance settings** (see below).

### For the administrator
The admin dashboard (`admin.html`) is open only to accounts with the `admin` role. Normal users who open it are sent back to the main page, and visitors who are not logged in are sent to the login page. It shows:
- **Statistics:** total users, total generations, generations today (UTC), total characters and failed generations.
- **Registered users:** email, role, status and join date, with **Enable / Disable** buttons for normal users.
- **TTS history:** the latest 100 requests from all users, with the user's email, the status (and the error note for failed requests) and a "View text" option for the full text.

### Disabled accounts
When the administrator disables a user:
- The user is signed out and cannot log in (the login page shows a message instead).
- The speech service also refuses their requests.
- The message includes a **Contact Administrator** button that opens a prefilled email draft in the user's own mail app. The page sends nothing by itself; the user must press Send. The plain email address is also shown as text. The address is the administrator's email configured in `web/js/auth.js`.

### Appearance settings
An **Appearance** panel is available on every page:
- **Theme:** Light or Dark. Until you choose, the site follows your operating system's setting.
- **Font size:** Small (90%), Medium (100%) or Large (115%).
- **Font:** System (sans-serif), Serif or Monospace.

Choices are saved only in your own browser (`localStorage` keys `tts_theme`, `tts_font_size`, `tts_font_family`). Nothing is stored in Supabase.

## Limits
These are enforced on the server, in the Edge Function (the browser copy only makes the page friendlier):
- **1,000 characters** per request.
- **20 successful generations per user per day.** The day is the UTC day and resets at 00:00 UTC. Failed generations are logged but do not count.

## How it works

```
Browser (GitHub Pages: HTML + CSS + JavaScript)
   |-- supabase-js --> Supabase Auth        (register, log in, session)
   |-- supabase-js --> PostgreSQL           (profiles, tts_requests; protected by Row Level Security)
   '-- fetch + login token --> Edge Function "generate-speech"
                                  |--> ElevenLabs API   (API key stored as a Supabase secret)
                                  '<-- MP3 audio, returned to the browser (never stored)
```

| Part | What it does |
|---|---|
| Frontend | Plain HTML, CSS and JavaScript in `web/`, with no build step. `supabase-js` is loaded from a CDN. Hosted on GitHub Pages. |
| Supabase Auth | Email/password accounts and sessions. |
| Supabase PostgreSQL | The `profiles` and `tts_requests` tables, protected by Row Level Security (RLS). |
| Edge Function `generate-speech` | The only code that talks to ElevenLabs. It checks the login, the account status, the text length, the voice and the daily limit, then logs the request. |
| ElevenLabs | Creates the speech with the `eleven_multilingual_v2` model. |

**Audio is not stored.** The browser plays and downloads a temporary copy. History keeps the text and details only, so old audio cannot be replayed after a reload; generate it again.

## Security
- `web/js/config.js` contains only the Supabase project URL and the **publishable** key, which are designed to be public. The service-role key and the ElevenLabs API key must **never** be placed in `web/` or committed to Git.
- The ElevenLabs API key exists only as a Supabase secret named `ELEVENLABS_API_KEY`, read by the Edge Function.
- The Edge Function does not trust the browser. It verifies the login token itself and accepts only voices approved for the chosen language.
- The Edge Function accepts browser requests only from these addresses (`ALLOWED_ORIGINS` in `index.ts`): `http://localhost:8000`, `http://127.0.0.1:8000`, `http://localhost:5500`, `http://127.0.0.1:5500` and the GitHub Pages site.
- The browser can never insert, update or delete `tts_requests`; only the Edge Function can write them.

## Database
The SQL is in `supabase/migrations/`.

**`profiles`** (one row per user, created automatically by a trigger when someone registers)

| Field | Notes |
|---|---|
| `id` | The user's id (links to the Supabase Auth user) |
| `email` | |
| `role` | `user` (default) or `admin` |
| `is_disabled` | `false` by default |
| `created_at` | |

**`tts_requests`** (one row per generation attempt)

| Field | Notes |
|---|---|
| `id` | |
| `user_id` | Links to `profiles` |
| `text` | The text that was submitted |
| `char_count` | |
| `voice_name` | |
| `language_code` | For example `en`, `fil`, `fr` |
| `status` | `success` or `error` |
| `error_message` | Short note for failed requests |
| `created_at` | |

**Row Level Security, in plain words**
- A user can read only their own profile and their own requests.
- An admin can read all profiles and all requests.
- An admin can enable or disable **normal users only** (`role = 'user'`). Admins cannot disable themselves or other admins.
- Nobody can change a `role` from the browser. The only column the browser may update is `is_disabled`, and RLS limits that to admins.
- A disabled admin is not treated as an admin.

## Setup and deployment

### 1. Supabase
1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in filename order (for example in the Supabase SQL Editor).
3. In Authentication settings, turn **email confirmation off**. The app is designed for this. If it is on, a new user only sees a message asking them to confirm their email, then log in.
4. Add the ElevenLabs API key as a Supabase secret named `ELEVENLABS_API_KEY` (Supabase dashboard, Edge Functions, Secrets, or `supabase secrets set ELEVENLABS_API_KEY=<your key>` with the Supabase CLI). Never put it in the repository.
5. Deploy the function in `supabase/functions/generate-speech` (with the Supabase CLI: `supabase functions deploy generate-speech`, or from the dashboard). Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function automatically.
6. Make the first admin by running this once in the SQL Editor, after that person has registered:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### 2. Connect the frontend
Put your Supabase project URL and publishable key in `web/js/config.js`.

### 3. Run locally
Serve the `web/` folder with any simple web server, for example:
```bash
cd web
python3 -m http.server 8000
```
Then open http://localhost:8000. The Edge Function allows only the addresses listed under Security, so use port 8000 or 5500 (for example VS Code Live Server). Another address would need to be added to `ALLOWED_ORIGINS` and the function redeployed.

### 4. Deploy the website (GitHub Pages)
The workflow `.github/workflows/deploy-pages.yml` publishes only the `web/` folder to GitHub Pages on every push to `main`. There is no build step.
- One-time setup in GitHub: **Settings, Pages, Build and deployment, Source: GitHub Actions**.
- If you host the site at a different address, add that address to `ALLOWED_ORIGINS` in `supabase/functions/generate-speech/index.ts` and redeploy the function.

### Changing languages or voices
The list of languages and voices exists in **two** places that must match:
- `web/js/config.js` (the dropdowns), and
- `supabase/functions/generate-speech/index.ts` (the approved voices the server accepts).

Edit both, then redeploy the function.

## Folder structure

```
README.md
docs/                          reserved for project documents (currently empty)
.github/workflows/
  deploy-pages.yml             publishes web/ to GitHub Pages
supabase/
  migrations/                  database SQL (tables, trigger, RLS)
  functions/generate-speech/
    index.ts                   the Edge Function (the only code that calls ElevenLabs)
web/
  index.html                   login
  register.html                registration
  app.html                     text-to-speech page (logged-in users)
  admin.html                   admin dashboard (admins only)
  css/style.css                all styling (colors are CSS variables at the top)
  img/                         logo and icons (SVG)
  js/config.js                 public Supabase URL and key, languages and voices
  js/supabaseClient.js         creates the shared Supabase client
  js/auth.js                   register, log in, log out, page protection, disabled-account message
  js/tts.js                    language/voice, generate, player, download, history
  js/admin.js                  admin statistics, users, all history
  js/appearance.js             theme, font size and font settings (every page)
```

## Known limitations
- **Voice coverage:** the Filipino voices are all male, Portuguese has no female voice and Italian has no male voice. On very small screens with a large font, long voice names can be cut off in the closed dropdown.
- **Contact Administrator** uses a `mailto:` link, so it needs a mail app on the user's device. That is why the address is also shown as text.
- **Daily limit:** it is counted per user per UTC day, so it resets at 00:00 UTC, not at local midnight.
- **ElevenLabs Default voices:** ElevenLabs has announced that its Default voices will no longer be accessible after 31 December 2026 (see its help article "How do I access ElevenLabs Default voices?"). If a voice used here stops working, choose a replacement and update both voice lists as described above.
- **ElevenLabs plan:** generation uses credits from the ElevenLabs account that owns the API key, so usage is also limited by that plan.
