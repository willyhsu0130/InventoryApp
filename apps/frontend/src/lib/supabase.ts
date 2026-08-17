import { createClient } from "@supabase/supabase-js";
import type { Database } from "@my-inventory-app/shared";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Note: Supabase's public key is conventionally called ANON_KEY
const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase environment variables! Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});