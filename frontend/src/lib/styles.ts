// src/lib/styles.ts
// Shared control styling so toolbars and forms look the same on every page.

/** Secondary toolbar action (refresh, filters). */
export const TOOLBAR_BUTTON =
    "h-9 px-3.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition shrink-0 flex items-center justify-center gap-x-1.5 disabled:opacity-50";

/** Square, icon-only variant of TOOLBAR_BUTTON. */
export const TOOLBAR_ICON_BUTTON =
    "h-9 w-9 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition shrink-0 flex items-center justify-center disabled:opacity-50";

/** Primary/confirming action. */
export const PRIMARY_BUTTON =
    "h-9 px-3.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0 flex items-center justify-center gap-x-1.5 disabled:opacity-50";

/** Text/number/select control, used in both toolbars and modal forms. */
export const CONTROL_INPUT =
    "w-full h-9 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition";

export const FIELD_LABEL = "text-xs text-slate-400 font-sans";

export const ERROR_PANEL =
    "p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm font-sans";

/** Centered placeholder for loading / empty states inside a page body. */
export const PLACEHOLDER_PANEL =
    "flex justify-center items-center h-48 text-slate-400 animate-pulse font-medium text-sm";
