// apps/frontend/src/lib/supabase.ts
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { type Database, SupabaseError } from "@my-inventory-app/shared";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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

export async function unwrap<T>(
    queryPromise: PromiseLike<{ data: T; error: PostgrestError | null }>
): Promise<NonNullable<T>> {
    const { data, error } = await queryPromise;

    if (error) {
        console.error("Supabase Operation Failed:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        throw new SupabaseError(error);
    }

    if (data === null || data === undefined) {
        throw new Error("Supabase returned no data.");
    }

    return data as NonNullable<T>;
}