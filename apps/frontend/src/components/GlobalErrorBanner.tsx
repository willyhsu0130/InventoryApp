import { AlertCircle, X } from "lucide-react";
import { useError } from "@/hooks/useError";
import { Button } from "@/components/ui/button";

export function GlobalErrorBanner() {
    const { errorMessage, warningMessage, setWarningMessage } = useError();

    if (!errorMessage && !warningMessage) {
        return null;
    }

    const message = errorMessage || warningMessage;
    const isWarning = !errorMessage && Boolean(warningMessage);

    return (
        <div
            className={`shrink-0 border-b px-4 py-2 ${isWarning
                ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
            role="alert"
        >
            <div className="mx-auto flex max-w-screen-2xl items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1 wrap-break-word">{message}</p>
                <Button
                    aria-label="Dismiss notification"
                    className="size-6 shrink-0"
                    onClick={() => setWarningMessage("")}
                    size="icon-xs"
                    variant="ghost"
                >
                    <X aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
