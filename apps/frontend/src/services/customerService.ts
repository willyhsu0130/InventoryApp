import { supabase, unwrap } from "@/lib/supabase";
import type { Customer, Database } from "@my-inventory-app/shared";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

function toCustomerDomain(row: CustomerRow): Customer {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        line1: row.line1,
        line2: row.line2 ?? null,
        city: row.city,
        state: row.state ?? null,
        country: row.country,
        phoneNumber: row.phone_number,
        company: row.company ?? null,
    };
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Creates a new Customer.
 * Validates mandatory fields and email format before writing to the database.
 */
export async function createCustomer(
    payload: Omit<Customer, "id">
): Promise<Customer> {
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const line1 = payload.line1?.trim();
    const city = payload.city?.trim();
    const country = payload.country?.trim();
    const phoneNumber = payload.phoneNumber?.trim();

    if (!firstName) throw new Error("First name cannot be empty.");
    if (!lastName) throw new Error("Last name cannot be empty.");
    if (!email) throw new Error("Email cannot be empty.");
    if (!isValidEmail(email)) throw new Error("Invalid email address format.");
    if (!line1) throw new Error("Address line1 cannot be empty.");
    if (!city) throw new Error("City cannot be empty.");
    if (!country) throw new Error("Country cannot be empty.");
    if (!phoneNumber) throw new Error("Phone number cannot be empty.");

    const row = await unwrap(
        supabase
            .from("customers")
            .insert({
                first_name: firstName,
                last_name: lastName,
                email,
                line1,
                line2: payload.line2?.trim() || null,
                city,
                state: payload.state?.trim() || null,
                country,
                phone_number: phoneNumber,
                company: payload.company?.trim() || null,
            })
            .select()
            .single()
    );

    return toCustomerDomain(row);
}

/**
 * Retrieves a single customer by primary key ID.
 */
export async function getCustomerById(id: number): Promise<Customer> {
    const row = await unwrap(
        supabase
            .from("customers")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toCustomerDomain(row);
}

/**
 * Retrieves all customers ordered by ID.
 */
export async function getCustomers(): Promise<Customer[]> {
    const rows = await unwrap(
        supabase
            .from("customers")
            .select("*")
            .order("id", { ascending: true })
    );

    return rows.map(toCustomerDomain);
}

/**
 * Retrieves a customer record by their exact email address.
 */
export async function getCustomerByEmail(email: string): Promise<Customer> {
    const trimmedEmail = email?.trim().toLowerCase();
    if (!trimmedEmail) {
        throw new Error("Email cannot be empty.");
    }

    const row = await unwrap(
        supabase
            .from("customers")
            .select("*")
            .eq("email", trimmedEmail)
            .single()
    );

    return toCustomerDomain(row);
}

/**
 * Updates a customer record partially by ID.
 */
export async function updateCustomerById(
    id: number,
    payload: Partial<Omit<Customer, "id">>
): Promise<Customer> {
    const updateData: Database["public"]["Tables"]["customers"]["Update"] = {};

    if (payload.firstName !== undefined) {
        const val = payload.firstName.trim();
        if (!val) throw new Error("First name cannot be empty.");
        updateData.first_name = val;
    }

    if (payload.lastName !== undefined) {
        const val = payload.lastName.trim();
        if (!val) throw new Error("Last name cannot be empty.");
        updateData.last_name = val;
    }

    if (payload.email !== undefined) {
        const val = payload.email.trim().toLowerCase();
        if (!val) throw new Error("Email cannot be empty.");
        if (!isValidEmail(val)) throw new Error("Invalid email address format.");
        updateData.email = val;
    }

    if (payload.line1 !== undefined) {
        const val = payload.line1.trim();
        if (!val) throw new Error("Address line1 cannot be empty.");
        updateData.line1 = val;
    }

    if (payload.line2 !== undefined) {
        updateData.line2 = payload.line2 ? payload.line2.trim() : null;
    }

    if (payload.city !== undefined) {
        const val = payload.city.trim();
        if (!val) throw new Error("City cannot be empty.");
        updateData.city = val;
    }

    if (payload.state !== undefined) {
        updateData.state = payload.state ? payload.state.trim() : null;
    }

    if (payload.country !== undefined) {
        const val = payload.country.trim();
        if (!val) throw new Error("Country cannot be empty.");
        updateData.country = val;
    }

    if (payload.phoneNumber !== undefined) {
        const val = payload.phoneNumber.trim();
        if (!val) throw new Error("Phone number cannot be empty.");
        updateData.phone_number = val;
    }

    if (payload.company !== undefined) {
        updateData.company = payload.company ? payload.company.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
        return getCustomerById(id);
    }

    const row = await unwrap(
        supabase
            .from("customers")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()
    );

    return toCustomerDomain(row);
}

/**
 * Hard-deletes a customer by ID.
 */
export async function deleteCustomerById(id: number): Promise<void> {
    await unwrap(
        supabase
            .from("customers")
            .delete()
            .eq("id", id)
            .select()
            .single()
    );
}