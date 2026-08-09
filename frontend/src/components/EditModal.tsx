// src/components/common/EditModal.tsx
import type { ReactNode } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EditModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    onDelete?: () => void | Promise<void>;
    isSaving?: boolean;
    children: ReactNode;
    showSaveButton?: boolean;
}

export const EditModal = ({
    isOpen,
    title,
    onClose,
    onSave,
    onDelete,
    isSaving = false,
    showSaveButton = true,
    children,
}: EditModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-100">{title}</h3>

                    <div className="flex gap-x-3 items-center">
                        {/* Only meaningful when edits autosave — with a save button
                            present, nothing is stored until it is pressed. */}
                        {!showSaveButton && (
                            isSaving ?
                                <p>儲存中...</p>
                                :
                                <p>所有修改已儲存</p>
                        )}
                        {
                            onDelete &&
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button variant="secondary" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        刪除產品
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-md transition"
                            disabled={isSaving}
                        >
                            ✕
                        </button>
                    </div>

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
                    {showSaveButton && onSave && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {isSaving ? "儲存中..." : "儲存 (Save)"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};