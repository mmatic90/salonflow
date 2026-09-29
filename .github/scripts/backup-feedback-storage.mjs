import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_BACKUP_KEY;

if (!url || !key) throw new Error("Missing backup credentials");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Storage backup helper ready", Boolean(supabase));
