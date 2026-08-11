export const formatQuantity = (value: number | string | null | undefined): string => {
    const quantity = typeof value === "number" ? value : Number.parseFloat(value ?? "");

    if (!Number.isFinite(quantity)) {
        return "-";
    }

    return quantity.toLocaleString(undefined, {
        maximumFractionDigits: 3,
    });
};
