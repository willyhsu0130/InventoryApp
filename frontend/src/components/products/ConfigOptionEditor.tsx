// src/components/ConfigManager.tsx
import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import type { KatanaProductConfig } from "../../models/katana/katana";

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
            <div className="grid grid-cols-1 gap-2 border-b border-slate-800 pb-2 sm:grid-cols-3 sm:gap-x-3">
                <div className="sm:col-span-1">
                    <p className="text-xs font-medium text-slate-400">款式選項 (例如: 尺寸)</p>
                </div>
                <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-slate-400">款式種類 (例如: S, M, L)</p>
                </div>
            </div>

            {/* Existing Configs */}
            {configs.map((config, index) => (
                <div key={index} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-3 sm:gap-x-3">
                    <div className="sm:col-span-1">
                        <input
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-200 focus:outline-none"
                            value={config.name}
                            readOnly
                        />
                    </div>
                    <div className="flex items-center justify-between sm:col-span-2">
                        <div className="flex gap-2 flex-wrap">
                            {config.values.map((value, vIdx) => (
                                <div key={vIdx} className="flex bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 gap-x-1.5 items-center">
                                    <span className="text-xs text-slate-300">{value}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRemoveConfigOption(index)}
                            className="text-slate-500 hover:text-red-400 p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Inline Add Config Section */}
            {addingConfigOption ? (
                <div className="flex flex-col gap-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <input
                                type="text"
                                placeholder="選項名稱 (例: 顏色)"
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-200 focus:outline-none"
                                value={newConfigName}
                                onChange={(e) => setNewConfigName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-x-2 sm:col-span-2">
                            <input
                                type="text"
                                placeholder="輸入數值後按 Enter"
                                className="min-w-0 flex-1 rounded border border-input bg-background px-2.5 py-1 text-sm text-foreground focus:outline-none"
                                value={newConfigValueInput}
                                onChange={(e) => setNewConfigValueInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddNewConfigValue();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddNewConfigValue}
                                className="shrink-0 rounded border border-input bg-background px-3 py-1 text-xs text-foreground hover:bg-muted"
                            >
                                新增值
                            </button>
                        </div>
                    </div>

                    {newConfigValues.length > 0 && (
                        <div className="flex gap-2 flex-wrap pt-1">
                            {newConfigValues.map((val) => (
                                <div key={val} className="flex bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 gap-x-1.5 items-center">
                                    <span className="text-xs text-slate-200">{val}</span>
                                    <X
                                        className="w-3.5 h-3.5 text-slate-400 hover:text-red-400 cursor-pointer"
                                        onClick={() => handleRemoveNewConfigValue(val)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-x-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAddingConfigOption(false);
                                setNewConfigName("");
                                setNewConfigValues([]);
                            }}
                            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            onClick={handleAddConfig}
                            disabled={!newConfigName.trim() || newConfigValues.length === 0}
                            className="flex items-center gap-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-xs text-white"
                        >
                            <Check className="w-3.5 h-3.5" />
                            確定新增
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setAddingConfigOption(true)}
                    className="flex items-center gap-x-2 text-xs text-slate-400 hover:text-slate-200 pt-1"
                >
                    <Plus className="w-4 h-4" />
                    新增款式選項
                </button>
            )}
        </div>
    );
};