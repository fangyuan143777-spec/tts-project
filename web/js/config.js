// Public settings. Only the Supabase project URL and the publishable (anon) key
// belong here. NEVER put the service-role key, the ElevenLabs API key or any other
// secret in web/.
window.APP_CONFIG = {
  SUPABASE_URL: "https://rkykmkzdmftkxlnmuzuo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_PXjmswfuz__Ujw1_iCYehQ_-2A1n0DX",

  // Used for the counter and the Generate button. The Edge Function enforces the
  // real limit; this copy only makes the page friendlier.
  MAX_CHARS: 1000,

  // Languages shown in the page. voiceId is a public identifier, not a secret.
  // The Edge Function has its own copy of this mapping and does not trust this one.
  LANGUAGES: [
    { code: "en", name: "English", voiceName: "Alice - Clear, Engaging Educator", voiceId: "Xb7hH8MSUJpSbSDYk0k2" },
    { code: "fil", name: "Filipino", voiceName: "Charlie - Deep, Confident, Energetic", voiceId: "IKne3meq5aSn9XLyUdCD" },
    { code: "es", name: "Spanish", voiceName: "Roger - Laid-Back, Casual, Resonant", voiceId: "CwhRBWXzGAHq8TQ4Fs17" },
    { code: "ja", name: "Japanese", voiceName: "George - Warm, Captivating Storyteller", voiceId: "JBFqnCBsd6RMkjVDRZzb" },
    { code: "zh", name: "Chinese", voiceName: "Sarah - Mature, Reassuring, Confident", voiceId: "EXAVITQu4vr4xnSDxMaL" },
  ],
};
