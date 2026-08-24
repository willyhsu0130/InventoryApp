// src/components/customers/EditCustomer.tsx
import {
    useImperativeHandle,
    useState,
    useEffect,
    type FC,
    type Ref,
} from "react";
import { Loader2 } from "lucide-react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import type { Customer } from "@my-inventory-app/shared";
import {
    createCustomer,
    updateCustomerById,
    getCustomerById,
} from "@/services/customerService";

export interface EditCustomerHandle {
    /** Persists an unsaved draft or updates an existing customer. */
    submit: () => Promise<void>;
}

interface EditCustomerProps {
    id: number | -1;
    onSavingChange?: (isSaving: boolean) => void;
    /** Called with the customer id once created or updated. */
    onSuccess?: (customerId: number) => void;
    ref?: Ref<EditCustomerHandle>;
}

export const EditCustomer: FC<EditCustomerProps> = ({
    id,
    onSavingChange,
    onSuccess,
    ref,
}) => {
    const isCreating = id <= 0;

    const [isLoading, setIsLoading] = useState<boolean>(!isCreating);
    const [formError, setFormError] = useState<string | null>(null);

    // Form State mapped to Customer domain model
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [company, setCompany] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [line1, setLine1] = useState<string>("");
    const [line2, setLine2] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [state, setState] = useState<string>("");
    const [country, setCountry] = useState<string>("Taiwan");

    // Fetch existing customer on mount in Edit Mode
    useEffect(() => {
        if (isCreating) return;

        let isMounted = true;

        getCustomerById(id)
            .then((customer: Customer) => {
                if (!isMounted) return;
                setFirstName(customer.firstName ?? "");
                setLastName(customer.lastName ?? "");
                setCompany(customer.company ?? "");
                setEmail(customer.email ?? "");
                setPhoneNumber(customer.phoneNumber ?? "");
                setLine1(customer.line1 ?? "");
                setLine2(customer.line2 ?? "");
                setCity(customer.city ?? "");
                setState(customer.state ?? "");
                setCountry(customer.country ?? "Taiwan");
                setIsLoading(false);
            })
            .catch((err) => {
                if (isMounted) {
                    setFormError(err instanceof Error ? err.message : "載入客戶資料失敗。");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [id, isCreating]);

    const handleSubmit = async () => {
        if (!firstName.trim() && !lastName.trim() && !company.trim()) {
            setFormError("請至少填寫客戶姓名或公司名稱。");
            return;
        }

        setFormError(null);
        onSavingChange?.(true);

        const payload: Omit<Customer, "id"> = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company.trim() || null,
            email: email.trim(),
            phoneNumber: phoneNumber.trim(),
            line1: line1.trim(),
            line2: line2.trim() || null,
            city: city.trim(),
            state: state.trim() || null,
            country: country.trim(),
        };

        try {
            if (isCreating) {
                const created = await createCustomer(payload);
                onSuccess?.(created.id);
            } else {
                const updated = await updateCustomerById(id, payload);
                onSuccess?.(updated.id);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "儲存客戶資料失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm font-medium">載入客戶資訊中...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-y-4">
            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>名字 (First Name)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 偉立"
                        value={firstName}
                        onChange={(e) => {
                            setFormError(null);
                            setFirstName(e.target.value);
                        }}
                    />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>姓氏 (Last Name)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 許"
                        value={lastName}
                        onChange={(e) => {
                            setFormError(null);
                            setLastName(e.target.value);
                        }}
                    />
                </div>

                {/* Company */}
                <div className="flex flex-col gap-y-1 sm:col-span-2">
                    <label className={FIELD_LABEL}>公司名稱 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 晁欣實業有限公司"
                        value={company}
                        onChange={(e) => {
                            setFormError(null);
                            setCompany(e.target.value);
                        }}
                    />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>電子郵件</label>
                    <input
                        type="email"
                        className={CONTROL_INPUT}
                        placeholder="customer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>聯絡電話</label>
                    <input
                        type="tel"
                        className={CONTROL_INPUT}
                        placeholder="0912345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </div>

                {/* Address Line 1 */}
                <div className="flex flex-col gap-y-1 sm:col-span-2">
                    <label className={FIELD_LABEL}>地址第 1 行</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="街道名稱、門牌號碼"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                    />
                </div>

                {/* Address Line 2 */}
                <div className="flex flex-col gap-y-1 sm:col-span-2">
                    <label className={FIELD_LABEL}>地址第 2 行 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="樓層、房號"
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                    />
                </div>

                {/* City */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>城市 / 區域</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="台北市大安區"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                    />
                </div>

                {/* State / Province */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>省 / 州 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 台灣"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                    />
                </div>

                {/* Country */}
                <div className="flex flex-col gap-y-1 sm:col-span-2">
                    <label className={FIELD_LABEL}>國家 / 地區</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="Taiwan"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};