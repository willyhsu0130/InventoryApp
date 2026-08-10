// src/components/customers/EditCustomer.tsx
import { useImperativeHandle, useState } from "react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import { useCustomersCatalog } from "@/hooks/useContexts";
import type { KatanaCustomerDraft } from "@/models/katana/customers";

export interface EditCustomerHandle {
    /** Persists an unsaved draft. No-op once the customer exists. */
    submit: () => Promise<void>;
}

interface EditCustomerProps {
    id: number | -1;
    onSavingChange?: (isSaving: boolean) => void;
    /** Called with the customer id once created or updated. */
    onSuccess?: (customerId: number) => void;
    ref?: React.Ref<EditCustomerHandle>;
}

export const EditCustomer = ({
    id,
    onSavingChange,
    onSuccess,
    ref,
}: EditCustomerProps) => {
    // -1 means "not in Katana yet": stays local until handleCreate (POST).
    const isCreating = id === -1;

    const { customers, createCustomer, editCustomer } = useCustomersCatalog();
    const existingCustomer = !isCreating ? customers.get(id) : null;

    // Form State
    const [name, setName] = useState<string>(existingCustomer?.name ?? "");
    const [firstName, setFirstName] = useState<string>(existingCustomer?.first_name ?? "");
    const [lastName, setLastName] = useState<string>(existingCustomer?.last_name ?? "");
    const [company, setCompany] = useState<string>(existingCustomer?.company ?? "");
    const [email, setEmail] = useState<string>(existingCustomer?.email ?? "");
    const [phone, setPhone] = useState<string>(existingCustomer?.phone ?? "");
    const [currency, setCurrency] = useState<string>(existingCustomer?.currency ?? "TWD");
    const [comment, setComment] = useState<string>(existingCustomer?.comment ?? "");
    const [discountRate, setDiscountRate] = useState<string>(
        existingCustomer?.discount_rate != null ? existingCustomer.discount_rate.toString() : ""
    );

    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async () => {
        const cleanName = name.trim();
        if (!cleanName) {
            setFormError("請輸入客戶名稱。");
            return;
        }

        setFormError(null);
        onSavingChange?.(true);

        try {
            const draftPayload: KatanaCustomerDraft = {
                name: cleanName,
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                company: company.trim() || null,
                email: email.trim() || null,
                phone: phone.trim() || null,
                currency: currency.trim() || "TWD",
                comment: comment.trim() || null,
                discount_rate: discountRate !== "" ? parseFloat(discountRate) : null,
            };

            if (isCreating) {
                const created = await createCustomer(draftPayload);
                onSuccess?.(created.id); // 👈 Passes the new ID
            } else {
                const updated = await editCustomer(id, draftPayload);
                onSuccess?.(updated.id); // 👈 Triggers modal close on edit success
            }
        } catch (err) {
            console.error("Failed to save customer:", err);
            setFormError(err instanceof Error ? err.message : "儲存客戶資料失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    return (
        <div className="flex flex-col gap-y-5">
            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>客戶全名 / 顯示名稱 *</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 王小明 或 台灣積體電路"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* First Name */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>名字 (First Name)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 小明"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>姓氏 (Last Name)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 王"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </div>

                {/* Company */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>公司名稱</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: Acme Ltd."
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                    />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>電話號碼</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 0912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>電子郵件</label>
                    <input
                        type="email"
                        className={CONTROL_INPUT}
                        placeholder="例: customer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                {/* Currency */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>預設交易幣別</label>
                    <select
                        className={CONTROL_INPUT}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                    >
                        <option value="TWD">TWD - 新台幣</option>
                        <option value="USD">USD - 美元</option>
                        <option value="EUR">EUR - 歐元</option>
                        <option value="JPY">JPY - 日圓</option>
                    </select>
                </div>

                {/* Discount Rate */}
                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>預設折扣率 (%)</label>
                    <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        className={CONTROL_INPUT}
                        placeholder="例: 10 (代表 9 折)"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(e.target.value)}
                    />
                </div>

                {/* Comment */}
                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>備註 / 內部註記</label>
                    <textarea
                        rows={3}
                        className={CONTROL_INPUT}
                        placeholder="輸入關於此客戶的偏好或特別注意事項..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};