// generate-speech: the ONLY place that talks to ElevenLabs.
//
// Request  (POST, JSON):  { text, language, voice }   + "Authorization: Bearer <user JWT>"
// Success  (200):         MP3 bytes (audio/mpeg)
// Failure:                JSON { error: "<safe message>" } with an HTTP error status
//
// Secrets (set in Supabase, never in code):
//   ELEVENLABS_API_KEY            ElevenLabs API key
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   injected automatically by Supabase

import { createClient } from "npm:@supabase/supabase-js@2";

// ---- Server-side rules (the browser is NOT trusted) ------------------------
const MAX_CHARS = 1000;
const DAILY_LIMIT = 20; // successful generations per user per UTC day
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

// language code -> the one approved voice
const VOICES: Record<string, { voiceId: string; voiceName: string }> = {
  en: { voiceId: "Xb7hH8MSUJpSbSDYk0k2", voiceName: "Alice - Clear, Engaging Educator" },
  fil: { voiceId: "IKne3meq5aSn9XLyUdCD", voiceName: "Charlie - Deep, Confident, Energetic" },
  es: { voiceId: "CwhRBWXzGAHq8TQ4Fs17", voiceName: "Roger - Laid-Back, Casual, Resonant" },
  ja: { voiceId: "JBFqnCBsd6RMkjVDRZzb", voiceName: "George - Warm, Captivating Storyteller" },
  zh: { voiceId: "EXAVITQu4vr4xnSDxMaL", voiceName: "Sarah - Mature, Reassuring, Confident" },
};

// Websites allowed to call this function from a browser.
// Add your GitHub Pages address here (origin only: scheme + host, no path).
const ALLOWED_ORIGINS = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5500", // VS Code Live Server
  "http://127.0.0.1:5500", // VS Code Live Server
  "https://fangyuan143777-spec.github.io",
];

// ---- Helpers ---------------------------------------------------------------
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonError(status: number, message: string, cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// ---- Handler ---------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonError(405, "Method not allowed.", cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!supabaseUrl || !serviceKey || !elevenKey) {
    console.error("Missing server configuration (a required secret is not set).");
    return jsonError(500, "The speech service is not configured.", cors);
  }
  // Service-role client: used only inside this function, never sent to the browser.
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Authenticate the caller.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonError(401, "Please log in.", cors);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return jsonError(401, "Please log in again.", cors);
  const userId = userData.user.id;

  // 2. Check the user's profile (must exist and must not be disabled).
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_disabled")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    console.error("Profile lookup failed:", profileError.message);
    return jsonError(500, "Something went wrong. Please try again.", cors);
  }
  if (!profile) return jsonError(403, "Account not found.", cors);
  if (profile.is_disabled) return jsonError(403, "Your account has been disabled.", cors);

  // 3. Validate the request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request.", cors);
  }
  const { text, language, voice } = (body ?? {}) as Record<string, unknown>;

  if (typeof text !== "string") return jsonError(400, "Text is required.", cors);
  const cleanText = text.trim();
  if (cleanText.length === 0) return jsonError(400, "Please enter some text.", cors);
  if (cleanText.length > MAX_CHARS) {
    return jsonError(400, `Text is too long (maximum ${MAX_CHARS} characters).`, cors);
  }
  if (typeof language !== "string" || !Object.hasOwn(VOICES, language)) {
    return jsonError(400, "Unsupported language.", cors);
  }
  const approved = VOICES[language];
  if (typeof voice !== "string" || voice !== approved.voiceId) {
    return jsonError(400, "That voice is not available for the selected language.", cors);
  }

  // 4. Daily limit: count today's (UTC) SUCCESSFUL requests. Failed ones don't count.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("tts_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", startOfDay.toISOString());
  if (countError) {
    console.error("Daily count failed:", countError.message);
    return jsonError(500, "Something went wrong. Please try again.", cors);
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return jsonError(
      429,
      `Daily limit reached (${DAILY_LIMIT} generations per day). It resets at 00:00 UTC.`,
      cors,
    );
  }

  // Writes one row to tts_requests (service role bypasses RLS; browsers cannot do this).
  const logRequest = (status: "success" | "error", errorMessage: string | null) =>
    admin.from("tts_requests").insert({
      user_id: userId,
      text: cleanText,
      char_count: cleanText.length,
      voice_name: approved.voiceName,
      language_code: language,
      status,
      error_message: errorMessage,
    });

  // 5. Call ElevenLabs. The language is NOT sent: the voice ID + model handle it.
  let elevenResponse: Response;
  try {
    elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${approved.voiceId}?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({ text: cleanText, model_id: MODEL_ID }),
      },
    );
  } catch (err) {
    console.error("ElevenLabs request failed:", err instanceof Error ? err.message : err);
    await logRequest("error", "Could not reach the speech provider.");
    return jsonError(502, "The speech service is unavailable. Please try again later.", cors);
  }

  if (!elevenResponse.ok) {
    // Details stay in the function logs; users only see a safe message.
    const detail = (await elevenResponse.text().catch(() => "")).slice(0, 300);
    console.error(`ElevenLabs returned HTTP ${elevenResponse.status}: ${detail}`);
    await logRequest("error", `Speech provider error (HTTP ${elevenResponse.status}).`);
    if (elevenResponse.status === 429) {
      return jsonError(503, "The speech service is busy. Please try again in a moment.", cors);
    }
    return jsonError(502, "Speech generation failed. Please try again later.", cors);
  }

  const audio = await elevenResponse.arrayBuffer();

  // 6. Record the success. If we cannot record it, fail instead of letting
  //    unrecorded generations slip past the daily limit.
  const { error: insertError } = await logRequest("success", null);
  if (insertError) {
    console.error("Could not record request:", insertError.message);
    return jsonError(500, "Something went wrong. Please try again.", cors);
  }

  // 7. Return the MP3. Nothing is stored.
  return new Response(audio, {
    status: 200,
    headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
});
