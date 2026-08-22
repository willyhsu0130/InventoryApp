// apps/frontend/src/lib/supabase.ts
import { createClient, type PostgrestResponse, type PostgrestSingleResponse } from "@supabase/supabase-js";
import { type Database, SupabaseError } from "@my-inventory-app/shared";
import dotenv from "dotenv";
import path from "path";

// Load root environment files when running in Node.js / Vitest
if (typeof window === "undefined") {
    dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}

// Resolve variables in both Vite (browser) and Node.js (Vitest)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY


if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase environment variables! Check your root .env.test or frontend .env file for VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY."
    );
}
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
    },
});

export async function unwrap<T>(
    queryPromise: PromiseLike<PostgrestSingleResponse<T> | PostgrestResponse<T>>
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