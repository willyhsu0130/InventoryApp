import { supabase, unwrap } from "@/lib/supabase";
import type {
    KatanaProduct,
    KatanaProductDraft,
    Database,
    VariantConfigAttribute,
} from "@my-inventory-app/shared";
import { convertProductToPayload } from "@my-inventory-app/shared";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type ProductConfigInsert = Database["public"]["Tables"]["product_configs"]["Insert"];

export interface VariantDraftPayload {
    sku?: string | null;
    sales_price?: number | null;
    purchase_price?: number | null;
    config_attributes: VariantConfigAttribute[];
}

export const productService = {
    // Fetch all non-deleted products with their configs
    async getAll(): Promise<KatanaProduct[]> {
        const data = await unwrap(
            supabase
                .from("products")
                .select(`
          *,
          configs:product_configs(*)
        `)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
        );

        return data as unknown as KatanaProduct[];
    },

    // Atomic creation of product + variants + inventory levels in a single Postgres transaction
    async createProductWithVariants(
        productDraft: KatanaProductDraft,
        variants: VariantDraftPayload[]
    ): Promise<{ id: number }> {
        if (!productDraft.name?.trim()) {
            throw new Error("Product name is required.");
        }

        const payload = convertProductToPayload(productDraft);

        const data = await unwrap(
            supabase.rpc("create_product_with_variants", {
                p_product: {
                    name: payload.name?.trim() ?? productDraft.name.trim(),
                    uom: payload.uom ?? "pcs",
                    category_name: payload.category_name ?? null,
                    default_supplier_id: payload.default_supplier_id ?? null,
                    additional_info: payload.additional_info ?? null,
                    purchase_uom: payload.purchase_uom ?? null,
                    purchase_uom_conversion_rate: payload.purchase_uom_conversion_rate ?? null,
                    is_sellable: payload.is_sellable ?? true,
                    is_purchasable: payload.is_purchasable ?? true,
                    is_producible: payload.is_producible ?? false,
                    is_auto_assembly: payload.is_auto_assembly ?? false,
                    batch_tracked: payload.batch_tracked ?? false,
                    serial_tracked: payload.serial_tracked ?? false,
                    operations_in_sequence: payload.operations_in_sequence ?? false,
                    configs: payload.configs ?? [],
                },
                p_variants: variants.map((v) => ({
                    sku: v.sku?.trim() ? v.sku.trim() : null,
                    sales_price: v.sales_price ?? 0,
                    purchase_price: v.purchase_price ?? 0,
                    config_attributes: v.config_attributes ?? [],
                })),
            })
        );

        return data as { id: number };
    },

    // Standalone product creation + config rows insert
    async create(draft: KatanaProductDraft): Promise<KatanaProduct> {
        if (!draft.name?.trim()) {
            throw new Error("Product name is required.");
        }

        const payload = convertProductToPayload(draft);
        const { configs, ...productData } = payload;

        const productInsertData: ProductInsert = {
            name: (productData.name ?? draft.name).trim(),
            uom: productData.uom ?? "pcs",
            category_name: productData.category_name ?? null,
            default_supplier_id: productData.default_supplier_id ?? null,
            additional_info: productData.additional_info ?? null,
            purchase_uom: productData.purchase_uom ?? null,
            purchase_uom_conversion_rate: productData.purchase_uom_conversion_rate ?? null,
            is_sellable: productData.is_sellable ?? true,
            is_purchasable: productData.is_purchasable ?? true,
            is_producible: productData.is_producible ?? false,
            is_auto_assembly: productData.is_auto_assembly ?? false,
            is_archived: false,
            batch_tracked: productData.batch_tracked ?? false,
            serial_tracked: productData.serial_tracked ?? false,
            operations_in_sequence: productData.operations_in_sequence ?? false,
            custom_field_collection_id: null,
        };

        const product = await unwrap(
            supabase
                .from("products")
                .insert(productInsertData)
                .select()
                .single()
        );

        let savedConfigs: Database["public"]["Tables"]["product_configs"]["Row"][] = [];

        if (configs && configs.length > 0) {
            const configPayloads: ProductConfigInsert[] = configs.map((c) => ({
                product_id: product.id,
                name: c.name,
                values: c.values ?? [],
            }));

            const insertedConfigs = await unwrap(
                supabase
                    .from("product_configs")
                    .insert(configPayloads)
                    .select()
            );

            savedConfigs = insertedConfigs ?? [];
        }

        return {
            ...product,
            configs: savedConfigs,
        } as unknown as KatanaProduct;
    },

    // Update product details and sync its config options
    async update(id: number, updatedDraft: KatanaProductDraft): Promise<KatanaProduct> {
        const payload = convertProductToPayload(updatedDraft);
        const { configs, ...productData } = payload;

        const updateData: ProductUpdate = {
            name: productData.name?.trim(),
            uom: productData.uom,
            category_name: productData.category_name,
            default_supplier_id: productData.default_supplier_id,
            additional_info: productData.additional_info,
            purchase_uom: productData.purchase_uom,
            purchase_uom_conversion_rate: productData.purchase_uom_conversion_rate,
            is_sellable: productData.is_sellable,
            is_purchasable: productData.is_purchasable,
            is_producible: productData.is_producible,
            is_auto_assembly: productData.is_auto_assembly,
            batch_tracked: productData.batch_tracked,
            serial_tracked: productData.serial_tracked,
            operations_in_sequence: productData.operations_in_sequence,
        };

        // 1. Update product row
        await unwrap(
            supabase
                .from("products")
                .update(updateData)
                .eq("id", id)
        );

        // 2. If configs are provided, synchronize them in product_configs table
        if (configs !== undefined) {
            await unwrap(
                supabase
                    .from("product_configs")
                    .delete()
                    .eq("product_id", id)
            );

            if (configs.length > 0) {
                const configPayloads: ProductConfigInsert[] = configs.map((c) => ({
                    product_id: id,
                    name: c.name,
                    values: c.values ?? [],
                }));

                await unwrap(
                    supabase
                        .from("product_configs")
                        .insert(configPayloads)
                );
            }
        }

        // 3. Return full updated product with refreshed configs
        const finalProduct = await unwrap(
            supabase
                .from("products")
                .select(`
          *,
          configs:product_configs(*)
        `)
                .eq("id", id)
                .single()
        );

        return finalProduct as unknown as KatanaProduct;
    },

    // Soft delete product
    async delete(id: number): Promise<void> {
        await unwrap(
            supabase
                .from("products")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id)
        );
    },
};