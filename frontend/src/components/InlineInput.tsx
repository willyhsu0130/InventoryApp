import { useState } from "react";

interface InlineInputProps<T extends string | number> {
    value: T;
    type?: "text" | "number";
    formatter?: (val: T) => string;
    onCommit: (newValue: T) => void;
    className?: string;
}

export const InlineInput = <T extends string | number>({
    value,
    type = "text",
    formatter,
    onCommit,
    className
}: InlineInputProps<T>) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState<string>(value?.toString() ?? "");

    // Track previous value prop during render
    const [prevValue, setPrevValue] = useState<T>(value);

    // Sync state during render if parent value changed and user isn't editing
    if (value !== prevValue) {
        setPrevValue(value);
        if (!isEditing) {
            setTempValue(value?.toString() ?? "");
        }
    }

    const handleBlur = () => {
        setIsEditing(false);

        if (type === "number") {
            const parsed = parseFloat(tempValue);
            const finalNumber = (isNaN(parsed) ? 0 : parsed) as T;
            onCommit(finalNumber);
        } else {
            onCommit(tempValue.trim() as T);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleBlur();
        } else if (e.key === "Escape") {
            setTempValue(value?.toString() ?? "");
            setIsEditing(false);
        }
    };

    const baseClasses = "w-full text-right px-2 py-1 rounded box-border font-sans";

    if (isEditing) {
        return (
            <input
                autoFocus
                size={1}
                onFocus={(e) => e.target.select()}
                type={type}
                step={type === "number" ? "0.01" : undefined}
                className="w-full text-center px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-slate-100 outline-none"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <input
            onClick={() => setIsEditing(true)}
            className={className ?? `${baseClasses} border border-transparent cursor-pointer hover:bg-slate-800/60 text-slate-200 transition-colors`}
            readOnly
            value={formatter ? formatter(value) : value}
        />


    )
};