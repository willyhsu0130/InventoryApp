import type { PostgrestError } from "@supabase/supabase-js";

export class SupabaseError extends Error {
    public readonly code: string;
    public readonly details: string;
    public readonly hint: string;

    constructor(error: PostgrestError) {
        super(error.message);
        this.name = "SupabaseError";
        this.code = error.code;
        this.details = error.details;
        this.hint = error.hint;

        // Maintains proper prototype chain in transpiled ES5/Node environments
        Object.setPrototypeOf(this, SupabaseError.prototype);
    }
}