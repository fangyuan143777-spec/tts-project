// Public settings. Only the Supabase project URL and the publishable (anon) key
// belong here. NEVER put the service-role key, the ElevenLabs API key or any other
// secret in web/.
window.APP_CONFIG = {
  SUPABASE_URL: "https://rkykmkzdmftkxlnmuzuo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_PXjmswfuz__Ujw1_iCYehQ_-2A1n0DX",

  // Used for the counter and the Generate button. The Edge Function enforces the
  // real limit; this copy only makes the page friendlier.
  MAX_CHARS: 1000,

  // Languages shown in the page. Each language lists the voices a user can pick; the FIRST voice
  // is the default. Voice IDs are public identifiers, not secrets. The Edge Function has its own
  // copy of this list and does not trust this one: keep both in sync when you change a voice.
  LANGUAGES: [
    {
      code: "en",
      name: "English",
      voices: [
        { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice - Clear, Engaging Educator" },
        { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel - Steady Broadcaster" },
        { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica - Playful, Bright, Warm" },
        { id: "nPczCjzI2devNBz1zQrb", name: "Brian - Deep, Resonant and Comforting" },
      ],
    },
    {
      code: "fil",
      name: "Filipino",
      voices: [
        { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie - Deep, Confident, Energetic" },
        { id: "JBFqnCBsd6RMkjVDRZzb", name: "George - Warm, Captivating Storyteller" },
        { id: "bIHbv24MWmeRgasZH58o", name: "Will - Relaxed Optimist" },
      ],
    },
    {
      code: "es",
      name: "Spanish",
      voices: [
        { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger - Laid-Back, Casual, Resonant" },
        { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda - Knowledgable, Professional" },
        { id: "cjVigY5qzO86Huf0OWal", name: "Eric - Smooth, Trustworthy" },
      ],
    },
    {
      code: "ja",
      name: "Japanese",
      voices: [
        { id: "JBFqnCBsd6RMkjVDRZzb", name: "George - Warm, Captivating Storyteller" },
        { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice - Clear, Engaging Educator" },
        { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica - Playful, Bright, Warm" },
      ],
    },
    {
      code: "zh",
      name: "Chinese",
      voices: [
        { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah - Mature, Reassuring, Confident" },
        { id: "nPczCjzI2devNBz1zQrb", name: "Brian - Deep, Resonant and Comforting" },
        { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily - Velvety Actress" },
      ],
    },
    {
      code: "fr",
      name: "French",
      voices: [
        { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice - Clear, Engaging Educator" },
        { id: "cjVigY5qzO86Huf0OWal", name: "Eric - Smooth, Trustworthy" },
        { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda - Knowledgable, Professional" },
      ],
    },
    {
      code: "de",
      name: "German",
      voices: [
        { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel - Steady Broadcaster" },
        { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily - Velvety Actress" },
        { id: "cjVigY5qzO86Huf0OWal", name: "Eric - Smooth, Trustworthy" },
      ],
    },
    {
      code: "pt",
      name: "Portuguese (Brazil)",
      voices: [
        { id: "nPczCjzI2devNBz1zQrb", name: "Brian - Deep, Resonant and Comforting" },
        { id: "iP95p4xoKVk53GoZ742B", name: "Chris - Charming, Down-to-Earth" },
        { id: "SAz9YHcvj6GT2YYXdXww", name: "River - Relaxed, Neutral, Informative" },
      ],
    },
    {
      code: "it",
      name: "Italian",
      voices: [
        { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice - Clear, Engaging Educator" },
        { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda - Knowledgable, Professional" },
        { id: "SAz9YHcvj6GT2YYXdXww", name: "River - Relaxed, Neutral, Informative" },
      ],
    },
  ],
};
