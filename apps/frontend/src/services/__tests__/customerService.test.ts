import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Customer, Database } from "@my-inventory-app/shared";
import {
    createCustomer,
    getCustomerById,
    getCustomers,
    getCustomerByEmail,
    updateCustomerById,
    deleteCustomerById,
} from "../customerService";

// Load environment variables for testing
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase credentials for test execution. Ensure SUPABASE_URL and SUPABASE_ANON_KEY exist."
    );
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

describe("Customer Service", () => {
    const createdCustomerIds: Customer["id"][] = [];
    let sharedCustomerId: number;

    const basePayload: Omit<Customer, "id"> = {
        firstName: "Jane",
        lastName: "Doe",
        email: `jane.doe.${Date.now()}@example.com`,
        line1: "123 Business Way",
        line2: "Suite 400",
        city: "Toronto",
        state: "ON",
        country: "Canada",
        phoneNumber: "+1-416-555-0199",
        company: "Acme Enterprises",
    };

    afterAll(async () => {
        if (createdCustomerIds.length > 0) {
            const { error } = await supabase
                .from("customers")
                .delete()
                .in("id", createdCustomerIds);
            if (error) console.error("Customer cleanup failed:", error);
        }
    });

    // ==========================================
    // 1. CORE CREATION (POST)
    // ==========================================
    describe("Core Creation", () => {
        it("POST: creates a customer with all fields provided", async () => {
            const customer = await createCustomer(basePayload);

            expect(customer).toBeDefined();
            expect(customer.id).toBeTypeOf("number");
            expect(customer.firstName).toBe(basePayload.firstName);
            expect(customer.lastName).toBe(basePayload.lastName);
            expect(customer.email).toBe(basePayload.email);
            expect(customer.line1).toBe(basePayload.line1);
            expect(customer.line2).toBe(basePayload.line2);
            expect(customer.city).toBe(basePayload.city);
            expect(customer.state).toBe(basePayload.state);
            expect(customer.country).toBe(basePayload.country);
            expect(customer.phoneNumber).toBe(basePayload.phoneNumber);
            expect(customer.company).toBe(basePayload.company);

            createdCustomerIds.push(customer.id);
            sharedCustomerId = customer.id;
        });

        it("POST: creates a customer with nullable fields set to null", async () => {
            const minimalPayload: Omit<Customer, "id"> = {
                firstName: "John",
                lastName: "Smith",
                email: `john.smith.${Date.now()}@example.com`,
                line1: "456 Simple Rd",
                line2: null,
                city: "Vancouver",
                state: null,
                country: "Canada",
                phoneNumber: "+1-604-555-0122",
                company: null,
            };

            const customer = await createCustomer(minimalPayload);

            expect(customer.id).toBeTypeOf("number");
            expect(customer.line2).toBeNull();
            expect(customer.state).toBeNull();
            expect(customer.company).toBeNull();

            createdCustomerIds.push(customer.id);
        });
    });

    // ==========================================
    // 2. QUERYING & SEARCH (GET)
    // ==========================================
    describe("Querying & Search", () => {
        it("GET by ID: retrieves a single customer by primary key", async () => {
            const customer = await getCustomerById(sharedCustomerId);

            expect(customer).toBeDefined();
            expect(customer.id).toBe(sharedCustomerId);
            expect(customer.email).toBe(basePayload.email);
        });

        it("GET All: retrieves customer list containing created records", async () => {
            const list = await getCustomers();

            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
            expect(list.some((c) => c.id === sharedCustomerId)).toBe(true);
        });

        it("GET by Email: retrieves customer by exact email address", async () => {
            const customer = await getCustomerByEmail(basePayload.email);

            expect(customer).toBeDefined();
            expect(customer.id).toBe(sharedCustomerId);
            expect(customer.email).toBe(basePayload.email);
        });
    });

    // ==========================================
    // 3. UPDATES (PATCH)
    // ==========================================
    describe("Updates & Mutations", () => {
        it("PATCH: updates primitive and contact details", async () => {
            const updated = await updateCustomerById(sharedCustomerId, {
                firstName: "Janet",
                phoneNumber: "+1-416-555-9988",
                company: "Acme Global",
            });

            expect(updated.id).toBe(sharedCustomerId);
            expect(updated.firstName).toBe("Janet");
            expect(updated.phoneNumber).toBe("+1-416-555-9988");
            expect(updated.company).toBe("Acme Global");
            expect(updated.lastName).toBe(basePayload.lastName); // Unchanged
        });

        it("PATCH: updates address fields", async () => {
            const updated = await updateCustomerById(sharedCustomerId, {
                line1: "789 Enterprise Blvd",
                line2: null,
                city: "Ottawa",
            });

            expect(updated.id).toBe(sharedCustomerId);
            expect(updated.line1).toBe("789 Enterprise Blvd");
            expect(updated.line2).toBeNull();
            expect(updated.city).toBe("Ottawa");
        });

        it("PATCH: passing empty payload leaves record unchanged", async () => {
            const before = await getCustomerById(sharedCustomerId);
            const after = await updateCustomerById(sharedCustomerId, {});

            expect(after.id).toBe(before.id);
            expect(after.firstName).toBe(before.firstName);
            expect(after.email).toBe(before.email);
            expect(after.phoneNumber).toBe(before.phoneNumber);
        });
    });

    // ==========================================
    // 4. DELETION
    // ==========================================
    describe("Deletion", () => {
        it("DELETE: hard-deletes a customer record from the database", async () => {
            const tempCustomer = await createCustomer({
                firstName: "Temp",
                lastName: "Customer",
                email: `temp.${Date.now()}@example.com`,
                line1: "1 Delete St",
                line2: null,
                city: "Montreal",
                state: "QC",
                country: "Canada",
                phoneNumber: "+1-514-555-0100",
                company: null,
            });

            await deleteCustomerById(tempCustomer.id);

            await expect(getCustomerById(tempCustomer.id)).rejects.toThrow();
        });
    });

    // ==========================================
    // 5. VALIDATION & ERROR BOUNDARIES
    // ==========================================
    describe("Validation & Error Boundaries", () => {
        it("POST: rejects duplicate email addresses", async () => {
            const duplicatePayload: Omit<Customer, "id"> = {
                ...basePayload,
                email: basePayload.email, // Already used by sharedCustomerId
            };

            await expect(createCustomer(duplicatePayload)).rejects.toThrow();
        });

        it("POST: rejects missing or whitespace-only mandatory fields", async () => {
            await expect(
                createCustomer({ ...basePayload, firstName: "   ", email: `err1.${Date.now()}@example.com` })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, lastName: "", email: `err2.${Date.now()}@example.com` })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, email: "" })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, line1: " ", email: `err3.${Date.now()}@example.com` })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, city: "", email: `err4.${Date.now()}@example.com` })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, country: "", email: `err5.${Date.now()}@example.com` })
            ).rejects.toThrow();

            await expect(
                createCustomer({ ...basePayload, phoneNumber: "", email: `err6.${Date.now()}@example.com` })
            ).rejects.toThrow();
        });

        it("POST: rejects invalid email formats", async () => {
            await expect(
                createCustomer({ ...basePayload, email: "invalid-email-address" })
            ).rejects.toThrow();
        });

        it("GET: fails when customer ID does not exist", async () => {
            await expect(getCustomerById(99999999)).rejects.toThrow();
        });

        it("PATCH: fails when attempting to update a non-existent customer ID", async () => {
            await expect(
                updateCustomerById(99999999, { firstName: "Ghost" })
            ).rejects.toThrow();
        });
    });
});