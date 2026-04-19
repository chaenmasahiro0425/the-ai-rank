// Shared Supabase client for serverless functions.
// Uses SERVICE_ROLE key (server-only) — NEVER expose to client.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseEnabled = Boolean(url && serviceKey);

export const supabase = supabaseEnabled
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "the-ai-rank" } },
    })
  : null;
