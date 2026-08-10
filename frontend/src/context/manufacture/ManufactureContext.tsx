import { createContext } from "react";
import type {
    KatanaManufacturingOrder,
    KatanaManufacturingOrderDraft,
} from "@/models/katana/manufacture";

export interface ManufactureContextType {
    manufactureOrders: Map<number, KatanaManufacturingOrder>;
    loading: boolean;
    refetchManufactureOrders: () => Promise<void>;
    createMO: (
        draft: KatanaManufacturingOrderDraft
    ) => Promise<KatanaManufacturingOrder>;
    editMO: (
        id: number,
        draft: Partial<KatanaManufacturingOrderDraft>
    ) => Promise<KatanaManufacturingOrder>;
    deleteMO: (id: number) => Promise<void>;
}

export const ManufactureContext = createContext<ManufactureContextType | null>(
    null
);