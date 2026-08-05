// src/components/common/EditModal.tsx
import type { ReactNode } from "react";

interface EditModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    isSaving?: boolean;
    children: ReactNode;
}

export const EditModal = ({
    isOpen,
    title,
    onClose,
    onSave,
    isSaving = false,
    children,
}: EditModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-md transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        disabled={isSaving}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition disabled:opacity-50"
                    >
                        {isSaving ? "儲存中..." : "儲存變更"}
                    </button>
                </div>
            </div>
        </div>
    );
};