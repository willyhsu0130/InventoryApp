import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TOOLBAR_BUTTON } from "@/lib/styles";

interface RefreshButtonProps {
    label: string;
    onClick: () => void;
}

export const RefreshButton = ({ label, onClick }: RefreshButtonProps) => (
    <Button type="button" variant="outline" className={TOOLBAR_BUTTON} onClick={onClick}>
        <RefreshCw className="size-4" />
        {label}
    </Button>
);
