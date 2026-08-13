// src/components/ConfigManager.tsx
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
    const [addingConfigOption, setAddingConfigOption] = useState(false);
    const [newConfigName, setNewConfigName] = useState("");
    const [newConfigValueInput, setNewConfigValueInput] = useState("");
    const [newConfigValues, setNewConfigValues] = useState<string[]>([]);

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

    const handleRemoveConfigOption = (indexToRemove: number) => {
        const updated = configs.filter((_, idx) => idx !== indexToRemove);
        onChange(updated);
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

            {/* Existing Configs */}
            {configs.map((config, index) => (
                <div key={index} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-3 sm:gap-x-3">
                    <div className="sm:col-span-1">
                        <input
                            className={CONTROL_INPUT}
                            value={config.name}
                            readOnly
                        />
                    </div>
                    <div className="flex items-center justify-between sm:col-span-2">
                        <div className="flex gap-2 flex-wrap">
                            {config.values.map((value, vIdx) => (
                                <div
                                    key={vIdx}
                                    className="flex bg-muted border border-border rounded-md px-2.5 py-1 gap-x-1.5 items-center"
                                >
                                    <span className="text-xs text-foreground font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRemoveConfigOption(index)}
                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                            title="移除選項"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Inline Add Config Section */}
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