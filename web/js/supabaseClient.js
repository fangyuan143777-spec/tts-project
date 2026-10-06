// Creates the one shared Supabase client (the supabase-js library is loaded from a CDN in each HTML page).
window.sb = window.supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY
);
