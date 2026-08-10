// ==========================================
// 4. CUSTOMER MODELS
// ==========================================

export interface KatanaCustomerAddressInput {
    entity_type: "billing" | "shipping";
    default?: boolean;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    phone?: string | null;
    line_1?: string | null;
    line_2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
}

export interface KatanaCustomerAddress extends KatanaCustomerAddressInput {
    id: number;
    customer_id: number;
    created_at: string;
    updated_at: string;
}

export interface KatanaCustomerInput {
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    currency?: string | null;
    reference_id?: string | null;
    category?: string | null;
    comment?: string | null;
    discount_rate?: number | null;
}

export interface KatanaCustomer extends KatanaCustomerInput {
    id: number;
    default_billing_id?: number | null;
    default_shipping_id?: number | null;
    addresses?: KatanaCustomerAddress[];
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface CreateCustomerAddressPayload {
    entity_type: "billing" | "shipping";
    default?: boolean;
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

export interface CreateCustomerPayload {
    name: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    email?: string;
    phone?: string;
    currency?: string;
    reference_id?: string;
    category?: string;
    comment?: string;
    discount_rate?: number;
    addresses?: CreateCustomerAddressPayload[];
}

export interface UpdateCustomerPayload {
    name?: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    email?: string;
    phone?: string;
    currency?: string;
    reference_id?: string;
    category?: string;
    comment?: string;
    discount_rate?: number;
    default_shipping_id?: number;
}

export interface KatanaCustomerDraft extends KatanaCustomerInput {
    id?: number;
    addresses?: KatanaCustomerAddressInput[];
}
export const convertCustomerToCreatePayload = (
    draft: KatanaCustomerDraft
): CreateCustomerPayload => {
    const cleanName = draft.name?.trim();
    if (!cleanName) {
        throw new Error("請輸入客戶名稱 (Name is required)。");
    }

    const cleanFirstName = draft.first_name?.trim() || undefined;
    const cleanLastName = draft.last_name?.trim() || undefined;
    const cleanCompany = draft.company?.trim() || undefined;
    const cleanEmail = draft.email?.trim() || undefined;
    const cleanPhone = draft.phone?.trim() || undefined;
    const cleanCurrency = draft.currency?.trim() || undefined;
    const cleanReferenceId = draft.reference_id?.trim() || undefined;
    const cleanCategory = draft.category?.trim() || undefined;
    const cleanComment = draft.comment?.trim() || undefined;

    const cleanAddresses =
        draft.addresses && draft.addresses.length > 0
            ? draft.addresses.map((addr) => ({
                entity_type: addr.entity_type,
                ...(addr.default !== undefined && { default: addr.default }),
                ...(addr.first_name?.trim() && {
                    first_name: addr.first_name.trim(),
                }),
                ...(addr.last_name?.trim() && { last_name: addr.last_name.trim() }),
                ...(addr.company?.trim() && { company: addr.company.trim() }),
                ...(addr.phone?.trim() && { phone: addr.phone.trim() }),
                ...(addr.line_1?.trim() && { line_1: addr.line_1.trim() }),
                ...(addr.line_2?.trim() && { line_2: addr.line_2.trim() }),
                ...(addr.city?.trim() && { city: addr.city.trim() }),
                ...(addr.state?.trim() && { state: addr.state.trim() }),
                ...(addr.zip?.trim() && { zip: addr.zip.trim() }),
                ...(addr.country?.trim() && { country: addr.country.trim() }),
            }))
            : undefined;

    return {
        name: cleanName,
        ...(cleanFirstName && { first_name: cleanFirstName }),
        ...(cleanLastName && { last_name: cleanLastName }),
        ...(cleanCompany && { company: cleanCompany }),
        ...(cleanEmail && { email: cleanEmail }),
        ...(cleanPhone && { phone: cleanPhone }),
        ...(cleanCurrency && { currency: cleanCurrency }),
        ...(cleanReferenceId && { reference_id: cleanReferenceId }),
        ...(cleanCategory && { category: cleanCategory }),
        ...(cleanComment && { comment: cleanComment }),
        ...(draft.discount_rate != null && { discount_rate: draft.discount_rate }),
        ...(cleanAddresses && { addresses: cleanAddresses }),
    };
};

export const convertCustomerToUpdatePayload = (
    draft: Partial<KatanaCustomerDraft>
): UpdateCustomerPayload => {
    const cleanName = draft.name?.trim() || undefined;
    const cleanFirstName = draft.first_name?.trim() || undefined;
    const cleanLastName = draft.last_name?.trim() || undefined;
    const cleanCompany = draft.company?.trim() || undefined;
    const cleanEmail = draft.email?.trim() || undefined;
    const cleanPhone = draft.phone?.trim() || undefined;
    const cleanCurrency = draft.currency?.trim() || undefined;
    const cleanReferenceId = draft.reference_id?.trim() || undefined;
    const cleanCategory = draft.category?.trim() || undefined;
    const cleanComment = draft.comment?.trim() || undefined;

    return {
        ...(cleanName && { name: cleanName }),
        ...(cleanFirstName && { first_name: cleanFirstName }),
        ...(cleanLastName && { last_name: cleanLastName }),
        ...(cleanCompany && { company: cleanCompany }),
        ...(cleanEmail && { email: cleanEmail }),
        ...(cleanPhone && { phone: cleanPhone }),
        ...(cleanCurrency && { currency: cleanCurrency }),
        ...(cleanReferenceId && { reference_id: cleanReferenceId }),
        ...(cleanCategory && { category: cleanCategory }),
        ...(cleanComment && { comment: cleanComment }),
        ...(draft.discount_rate != null && { discount_rate: draft.discount_rate }),
    };
};
