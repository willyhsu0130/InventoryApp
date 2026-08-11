// src/components/PageLayout.tsx
import type { ReactNode } from "react";

interface PageLayoutProps {
    title: string;
    /** Toolbar controls rendered at the right of the header. */
    actions?: ReactNode;
    subnav?: ReactNode;
    children: ReactNode;
    id?: string;
}

/**
 * Standard page frame: a fixed header strip above a height-bounded body, so
 * every page scrolls its own content instead of the window.
 */
export const PageLayout = ({ title, actions, subnav, children, id }: PageLayoutProps) => (
    <div className="flex h-full min-h-0 flex-col space-y-6 overflow-hidden p-6 text-slate-100" id={id}>
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-black">{title}</h1>

            {actions && (
                <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>
            )}
        </div>
        {subnav}

        <div className="flex min-h-0 w-full flex-1 flex-col" id="bottomContainer">
            {children}
        </div>
    </div>
);
