// src/components/common/EditModal.tsx
import type { ReactNode } from "react";
import { MoreVertical, Trash2, X, Download } from "lucide-react";
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
    onExport?: () => void | Promise<void>
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
    onExport,
    isSaving = false,
    showSaveButton = true,
    children,
}: EditModalProps) => {
    if (!isOpen) return null;
    const hasActions = Boolean(onDelete || onExport);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div
                className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-lg [&_input]:!border-input [&_input]:!bg-background [&_input]:!text-foreground [&_input]:scheme-light [&_select]:border-input! [&_select]:!bg-background [&_select]:!text-foreground [&_select]:[color-scheme:light] [&_textarea]:!border-input [&_textarea]:!bg-background [&_textarea]:!text-foreground [&_textarea]:[color-scheme:light] [&_input::placeholder]:!text-muted-foreground [&_textarea::placeholder]:!text-muted-foreground [&_input:focus]:!border-ring [&_select:focus]:!border-ring [&_textarea:focus]:!border-ring [&_input:focus]:!outline-none [&_select:focus]:!outline-none [&_textarea:focus]:!outline-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-modal-title"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 id="edit-modal-title" className="text-lg font-semibold">{title}</h3>

                    <div className="flex gap-x-3 items-center">
                        {/* Only meaningful when edits autosave — with a save button
                            present, nothing is stored until it is pressed. */}
                        {!showSaveButton && (
                            isSaving ?
                                <p className="text-sm text-muted-foreground">儲存中...</p>
                                :
                                <p className="text-sm text-muted-foreground">所有修改已儲存</p>
                        )}
                        {
                            (hasActions) &&
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button variant="secondary" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    }
                                />

                                <DropdownMenuContent align="end">

                                    {onExport && (
                                        <DropdownMenuItem onClick={onExport} className="gap-2 cursor-pointer">
                                            <Download className="h-4 w-4" />
                                            <span>匯出</span>
                                        </DropdownMenuItem>
                                    )}

                                    {onDelete && (
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onClick={onDelete}
                                            className="gap-2 cursor-pointer"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>刪除</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        }
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onClose}
                            disabled={isSaving}
                            aria-label="關閉"
                        >
                            <X />
                        </Button>
                    </div>

                </div>

                {/* Modal Body */}
                <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        variant="outline"
                    >
                        取消
                    </Button>
                    {showSaveButton && onSave && (
                        <Button
                            onClick={onSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "儲存中..." : "儲存 (Save)"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};