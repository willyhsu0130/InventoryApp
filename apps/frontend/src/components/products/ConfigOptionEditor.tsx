import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTROL_INPUT, FIELD_LABEL } from "@/lib/styles";
import type { KatanaProductConfig } from "@/models/katana/productVariant";

interface ConfigOptionsEditorProps {
    configs: KatanaProductConfig[];
    onChange: (updatedConfigs: KatanaProductConfig[]) => void;
}

export const ConfigOptionsEditor = ({ configs, onChange }: ConfigOptionsEditorProps) => {
    // New option section toggle & inputs
    const [addingConfigOption, setAddingConfigOption] = useState(false);
    const [newConfigName, setNewConfigName] = useState("");
    const [newConfigValueInput, setNewConfigValueInput] = useState("");
    const [newConfigValues, setNewConfigValues] = useState<string[]>([]);

    // Per-row input values for appending options to existing configs
    const [existingValueInputs, setExistingValueInputs] = useState<Record<number, string>>({});

    // -------------------------------------------------------------
    // Handlers for EXISTING Config Rows
    // -------------------------------------------------------------
    const handleAddValueToExistingConfig = (configIndex: number) => {
        const valToAppend = (existingValueInputs[configIndex] ?? "").trim();
        if (!valToAppend) return;

        const updated = configs.map((config, idx) => {
            if (idx !== configIndex) return config;

            // Avoid duplicate value tags in the same config
            if (config.values.includes(valToAppend)) return config;

            return {
                ...config,
                values: [...config.values, valToAppend],
            };
        });

        onChange(updated);

        // Reset input for this specific config row
        setExistingValueInputs((prev) => ({ ...prev, [configIndex]: "" }));
    };

    const handleRemoveValueFromExistingConfig = (configIndex: number, valToRemove: string) => {
        const updated = configs.map((config, idx) => {
            if (idx !== configIndex) return config;
            return {
                ...config,
                values: config.values.filter((v) => v !== valToRemove),
            };
        });

        onChange(updated);
    };

    const handleRemoveConfigOption = (indexToRemove: number) => {
        const updated = configs.filter((_, idx) => idx !== indexToRemove);
        onChange(updated);

        // Clean up corresponding input state
        setExistingValueInputs((prev) => {
            const next = { ...prev };
            delete next[indexToRemove];
            return next;
        });
    };

    // -------------------------------------------------------------
    // Handlers for INLINE NEW Config Section
    // -------------------------------------------------------------
    const handleAddNewConfigValue = () => {
        const trimmed = newConfigValueInput.trim();
        if (trimmed && !newConfigValues.includes(trimmed)) {
            setNewConfigValues((prev) => [...prev, trimmed]);
            setNewConfigValueInput("");
        }
    };

    const handleRemoveNewConfigValue = (valToRemove: string) => {
        setNewConfigValues((prev) => prev.filter((v) => v !== valToRemove));
    };

    const handleAddConfig = () => {
        if (!newConfigName.trim() || newConfigValues.length === 0) return;

        const newConfigObj: KatanaProductConfig = {
            name: newConfigName.trim(),
            values: newConfigValues,
        };

        onChange([...configs, newConfigObj]);

        // Reset temporary input state
        setNewConfigName("");
        setNewConfigValueInput("");
        setNewConfigValues([]);
        setAddingConfigOption(false);
    };

    return (
        <div className="flex flex-col gap-y-5">
            {/* Header Labels */}
            <div className="grid grid-cols-1 gap-2 border-b border-border pb-2 sm:grid-cols-3 sm:gap-x-3">
                <div className="sm:col-span-1">
                    <p className={FIELD_LABEL}>款式選項 (例如: 尺寸)</p>
                </div>
                <div className="sm:col-span-2">
                    <p className={FIELD_LABEL}>款式種類 (例如: S, M, L)</p>
                </div>
            </div>

            {/* Existing Configs with Dynamic Add-Value Input */}
            {configs.map((config, index) => (
                <div key={index} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-3 sm:gap-x-3">
                    {/* Config Name Field */}
                    <div className="sm:col-span-1">
                        <input
                            className={CONTROL_INPUT}
                            value={config.name}
                            readOnly
                        />
                    </div>

                    {/* Interactive Input Box with Tags */}
                    <div className="flex items-start justify-between gap-x-2 sm:col-span-2">
                        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-9.5 p-1.5 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30 transition-all">
                            {/* Render Existing Values as Badges */}
                            {config.values.map((value, vIdx) => (
                                <div
                                    key={vIdx}
                                    className="flex items-center gap-x-1 bg-muted border border-border rounded px-2 py-0.5 text-xs font-medium text-foreground"
                                >
                                    <span>{value}</span>
                                    <X
                                        className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                        onClick={() => handleRemoveValueFromExistingConfig(index, value)}
                                    />
                                </div>
                            ))}

                            {/* Inline Input to Add More Values */}
                            <input
                                type="text"
                                placeholder={config.values.length === 0 ? "輸入值後按 Enter..." : "新增..."}
                                className="flex-1 min-w-20 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none px-1 py-0.5"
                                value={existingValueInputs[index] ?? ""}
                                onChange={(e) =>
                                    setExistingValueInputs((prev) => ({
                                        ...prev,
                                        [index]: e.target.value,
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddValueToExistingConfig(index);
                                    }
                                }}
                            />
                        </div>

                        {/* Delete Entire Config Button */}
                        <button
                            type="button"
                            onClick={() => handleRemoveConfigOption(index)}
                            className="text-muted-foreground hover:text-destructive p-2 transition-colors shrink-0"
                            title="刪除此選項類別"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Inline Add New Config Category Section */}
            {addingConfigOption ? (
                <div className="flex flex-col gap-y-3 bg-muted/40 p-4 rounded-lg border border-border">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <input
                                type="text"
                                placeholder="選項名稱 (例: 顏色)"
                                className={CONTROL_INPUT}
                                value={newConfigName}
                                onChange={(e) => setNewConfigName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-x-2 sm:col-span-2">
                            <input
                                type="text"
                                placeholder="輸入數值後按 Enter"
                                className={CONTROL_INPUT}
                                value={newConfigValueInput}
                                onChange={(e) => setNewConfigValueInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddNewConfigValue();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddNewConfigValue}
                                className="shrink-0 text-xs"
                            >
                                新增值
                            </Button>
                        </div>
                    </div>

                    {newConfigValues.length > 0 && (
                        <div className="flex gap-2 flex-wrap pt-1">
                            {newConfigValues.map((val) => (
                                <div
                                    key={val}
                                    className="flex bg-background border border-border rounded-md px-2.5 py-1 gap-x-1.5 items-center text-xs text-foreground"
                                >
                                    <span>{val}</span>
                                    <X
                                        className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                        onClick={() => handleRemoveNewConfigValue(val)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-x-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setAddingConfigOption(false);
                                setNewConfigName("");
                                setNewConfigValues([]);
                            }}
                            className="text-xs"
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAddConfig}
                            disabled={!newConfigName.trim() || newConfigValues.length === 0}
                            className="flex items-center gap-x-1 text-xs"
                        >
                            <Check className="w-3.5 h-3.5" />
                            確定新增
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddingConfigOption(true)}
                    className="flex items-center gap-x-2 text-xs w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4" />
                    新增款式選項
                </Button>
            )}
        </div>
    );
};