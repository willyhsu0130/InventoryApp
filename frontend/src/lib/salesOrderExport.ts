// import type {
//     KatanaSalesOrder,
//     KatanaSalesOrderRow,
//     EnrichedSalesOrder,
//     EnrichedSalesOrderRow,
//     KatanaSalesOrderStatus,
// } from "@/models/katana/salesOrder";
// import type { ResolvedVariantInfo } from "@/models/katana/productVariant";
// import { katanaFetch } from "@/lib/katanaFetch";
// // ASSUMPTION: adjust this to wherever KATANA_API_ROUTES actually lives.
// import { KATANA_API_ROUTES } from "@/constants/katana";
// import type { KatanaLocation } from "@/models/katana/location";

// export type ExportSalesOrderData = KatanaSalesOrder & {
//     customer_name?: string;
//     resolved_variant_map?: Map<number, ResolvedVariantInfo>;
// };

// /**
//  * Traditional Chinese labels for Katana Sales Order status values
//  */
// export const STATUS_LABELS_ZH: Record<KatanaSalesOrderStatus, string> = {
//     NOT_SHIPPED: "未出貨",
//     PENDING: "待處理",
//     PARTIALLY_PACKED: "部分包裝",
//     PACKED: "已包裝",
//     PARTIALLY_DELIVERED: "部分交貨",
//     DELIVERED: "已交貨",
//     CANCELLED: "已取消",
// };

// /**
//  * Formats status codes into Traditional Chinese
//  */
// export const formatOrderStatusZh = (status?: KatanaSalesOrderStatus | string): string => {
//     if (!status) return "-";
//     return STATUS_LABELS_ZH[status as KatanaSalesOrderStatus] || status;
// };

// /**
//  * Type guard to check if a row is an EnrichedSalesOrderRow
//  */
// const isEnrichedRow = (
//     row: KatanaSalesOrderRow | EnrichedSalesOrderRow
// ): row is EnrichedSalesOrderRow => {
//     return "product_name" in row && typeof (row as EnrichedSalesOrderRow).product_name === "string";
// };

// /**
//  * Helper to extract variant display text and SKU from a row using provider maps or enriched rows
//  */
// const getRowVariantMeta = (
//     row: KatanaSalesOrderRow | EnrichedSalesOrderRow,
//     variantMap?: Map<number, ResolvedVariantInfo>,
//     getVariantDetailsFn?: (variantId: number) => ResolvedVariantInfo
// ): { title: string; sku: string } => {
//     // 1. EnrichedSalesOrderRow check
//     if (isEnrichedRow(row)) {
//         const details = row.variant_details ? ` (${row.variant_details})` : "";
//         return {
//             title: `${row.product_name}${details}`,
//             sku: row.sku || "-",
//         };
//     }

//     // 2. Resolver function passed from hook
//     if (getVariantDetailsFn) {
//         const info = getVariantDetailsFn(row.variant_id);
//         if (info && info.productId !== -1) {
//             const details = info.variant_details ? ` (${info.variant_details})` : "";
//             return {
//                 title: `${info.product_name}${details}`,
//                 sku: info.sku || "-",
//             };
//         }
//     }

//     // 3. Variant map lookup
//     const info = variantMap?.get(row.variant_id);
//     if (info) {
//         const details = info.variant_details ? ` (${info.variant_details})` : "";
//         return {
//             title: `${info.product_name}${details}`,
//             sku: info.sku || "-",
//         };
//     }

//     // 4. Fallback
//     return {
//         title: `款式 #${row.variant_id}`,
//         sku: "-",
//     };
// };

// /**
//  * Triggers a file download in the browser.
//  */
// const downloadFile = (content: string, filename: string, mimeType: string) => {
//     const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
// };

// /**
//  * Escapes strings for CSV formatting to handle commas, quotes, and newlines cleanly.
//  */
// const escapeCSV = (val: string | number | null | undefined): string => {
//     if (val == null) return '""';
//     const str = String(val).replace(/"/g, '""');
//     return `"${str}"`;
// };

// // ==========================================
// // 1. SALES ORDER CSV EXPORT
// // ==========================================

// export const exportSalesOrdersToCSV = (
//     orders: ExportSalesOrderData | ExportSalesOrderData[] | EnrichedSalesOrder | EnrichedSalesOrder[],
//     filenamePrefix = "sales_order",
//     getVariantDetailsFn?: (variantId: number) => ResolvedVariantInfo
// ) => {
//     const orderList = Array.isArray(orders) ? orders : [orders];

//     const headers = [
//         "訂單編號",
//         "訂單狀態",
//         "客戶編號",
//         "客戶名稱",
//         "訂單建立日期",
//         "預計交貨日",
//         "商品款式名稱",
//         "SKU",
//         "數量",
//         "單價 ($)",
//         "小計 ($)",
//         "幣別",
//         "訂單總額 ($)",
//         "出貨倉庫編號",
//     ];

//     const rows: string[][] = [];

//     orderList.forEach((so) => {
//         const orderNo = so.order_no || `SO-${so.id}`;
//         const customerName = (so as ExportSalesOrderData).customer_name || `客戶 #${so.customer_id}`;
//         const variantMap = (so as ExportSalesOrderData).resolved_variant_map;
//         const itemRows = so.sales_order_rows || [];
//         const statusZh = formatOrderStatusZh(so.status);

//         if (itemRows.length === 0) {
//             rows.push([
//                 escapeCSV(orderNo),
//                 escapeCSV(statusZh),
//                 escapeCSV(so.customer_id),
//                 escapeCSV(customerName),
//                 escapeCSV(so.order_created_date ?? ""),
//                 escapeCSV(so.delivery_date ?? ""),
//                 escapeCSV("-"),
//                 escapeCSV("-"),
//                 escapeCSV(0),
//                 escapeCSV(0),
//                 escapeCSV(0),
//                 escapeCSV(so.currency || "USD"),
//                 escapeCSV(so.total ?? 0),
//                 escapeCSV(so.location_id),
//             ]);
//         } else {
//             itemRows.forEach((row: KatanaSalesOrderRow | EnrichedSalesOrderRow) => {
//                 const qty = row.quantity ?? 0;
//                 const unitPrice = parseFloat(String(row.price_per_unit || "0"));
//                 const lineTotal = row.total ?? qty * unitPrice;
//                 const { title, sku } = getRowVariantMeta(row, variantMap, getVariantDetailsFn);

//                 rows.push([
//                     escapeCSV(orderNo),
//                     escapeCSV(statusZh),
//                     escapeCSV(so.customer_id),
//                     escapeCSV(customerName),
//                     escapeCSV(so.order_created_date ?? ""),
//                     escapeCSV(so.delivery_date ?? ""),
//                     escapeCSV(title),
//                     escapeCSV(sku),
//                     escapeCSV(qty),
//                     escapeCSV(unitPrice.toFixed(2)),
//                     escapeCSV(lineTotal.toFixed(2)),
//                     escapeCSV(so.currency || "USD"),
//                     escapeCSV(so.total ?? 0),
//                     escapeCSV(so.location_id),
//                 ]);
//             });
//         }
//     });

//     const csvContent =
//         "\uFEFF" +
//         [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

//     const dateStr = new Date().toISOString().split("T")[0];
//     const filename = `${filenamePrefix}_${dateStr}.csv`;

//     downloadFile(csvContent, filename, "text/csv");
// };

// // ==========================================
// // 2. SALES ORDER JSON EXPORT
// // ==========================================

// export const exportSalesOrdersToJSON = (
//     orders: ExportSalesOrderData | ExportSalesOrderData[] | EnrichedSalesOrder | EnrichedSalesOrder[],
//     filenamePrefix = "sales_order"
// ) => {
//     const jsonString = JSON.stringify(orders, null, 2);
//     const dateStr = new Date().toISOString().split("T")[0];
//     const filename = `${filenamePrefix}_${dateStr}.json`;

//     downloadFile(jsonString, filename, "application/json");
// };

// // ==========================================
// // 3. PRINT / SAVE AS PDF INVOICE
// // ==========================================

// /**
//  * Fetches all Katana locations (matching the same list-then-filter pattern
//  * used in loadLocations()) and returns the formatted address for the one
//  * matching locationId. Returns null on any failure — missing ID, network
//  * error, no matching location, or no address on it — so the caller can
//  * fall back to the previously-passed-in locationName / a generic
//  * "倉庫 #id" label instead of blocking or showing an error.
//  *
//  * Per Katana's API docs, a location's address object only has:
//  * line_1, line_2, city, state, zip, country — no phone field.
//  */
// const fetchLocationAddress = async (
//     locationId?: number
// ): Promise<{ name?: string | null; formattedAddress: string | null } | null> => {
//     if (!locationId) return null;

//     try {
//         const res = await katanaFetch<KatanaLocation[]>(KATANA_API_ROUTES.LOCATIONS);
//         if (!res.success || !Array.isArray(res.data)) return null;

//         const location = res.data.find((loc) => loc.id === locationId);
//         if (!location) return null;

//         const addr = location.address;
//         if (!addr) {
//             return { name: location.name || location.legal_name, formattedAddress: null };
//         }

//         const parts = [
//             addr.line_1,
//             addr.line_2,
//             [addr.city, addr.state, addr.zip].filter(Boolean).join(" ") || null,
//             addr.country,
//         ].filter(Boolean);

//         return {
//             name: location.name || location.legal_name,
//             formattedAddress: parts.length > 0 ? parts.join("<br>") : null,
//         };
//     } catch (err) {
//         console.error("Failed to fetch location address from Katana:", err);
//         return null;
//     }
// };

// export const printSalesOrderPDF = async (
//     order: ExportSalesOrderData | EnrichedSalesOrder,
//     locationName?: string,
//     getVariantDetailsFn?: (variantId: number) => ResolvedVariantInfo
// ): Promise<void> => {
//     // Open the popup FIRST, synchronously, before any `await` below. Chrome
//     // (and most browsers) only allow window.open() without being blocked
//     // when it happens as a direct, synchronous result of the user's click —
//     // doing it after an awaited fetch would get it silently blocked.
//     const printWindow = window.open("", "_blank", "width=900,height=1000");
//     if (!printWindow) {
//         console.error("Unable to open print window — it may have been blocked by the browser.");
//         return;
//     }
//     // Lightweight placeholder shown while we fetch the location address and
//     // build the final document.
//     printWindow.document.open();
//     printWindow.document.write(
//         `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>` +
//             `<body style="font-family: -apple-system, sans-serif; padding: 40px; color:#6b7280;">正在準備列印內容...</body></html>`
//     );
//     printWindow.document.close();

//     const title = order.order_no || `SO-${order.id}`;
//     const customerName = (order as ExportSalesOrderData).customer_name || `客戶 #${order.customer_id}`;
//     const variantMap = (order as ExportSalesOrderData).resolved_variant_map;
//     const itemRows = order.sales_order_rows || [];
//     const currencySymbol = order.currency || "$";
//     const statusZh = formatOrderStatusZh(order.status);

//     const shippingAddress = order.addresses?.find((a) => a.entity_type === "shipping");
//     const billingAddress = order.addresses?.find((a) => a.entity_type === "billing");

//     // Kick off the location fetch now, in parallel with the synchronous
//     // HTML-building work below — we only actually need the result right
//     // before writing the final document.
//     const locationAddressPromise = fetchLocationAddress(order.location_id);

//     const formatAddress = (addr?: typeof shippingAddress) => {
//         if (!addr) return "-";
//         const parts = [
//             `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
//             addr.company,
//             addr.line_1,
//             addr.line_2,
//             `${addr.city}, ${addr.state} ${addr.zip}`,
//             addr.country,
//             addr.phone ? `電話: ${addr.phone}` : null,
//         ].filter(Boolean);
//         return parts.join("<br>");
//     };

//     const tableRowsHtml = itemRows
//         .map((row: KatanaSalesOrderRow | EnrichedSalesOrderRow, idx: number) => {
//             const { title: variantTitle, sku } = getRowVariantMeta(row, variantMap, getVariantDetailsFn);
//             const qty = row.quantity ?? 0;
//             const unitPrice = parseFloat(String(row.price_per_unit || "0"));
//             const lineTotal = row.total ?? qty * unitPrice;

//             return `
//             <tr>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
//                     <strong>${variantTitle}</strong><br>
//                     <span style="font-size: 11px; color: #6b7280;">SKU: ${sku}</span>
//                 </td>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencySymbol}${unitPrice.toFixed(2)}</td>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${currencySymbol}${lineTotal.toFixed(2)}</td>
//                 <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
//                     <div style="width: 100%; height: 22px; border-bottom: 1px solid #9ca3af;"></div>
//                 </td>
//             </tr>
//             `;
//         })
//         .join("");

//     // Now resolve the location address fetch kicked off earlier — this is
//     // the only await before we build and write the final document.
//     const locationResult = await locationAddressPromise;
//     const resolvedLocationName = locationResult?.name || locationName || `倉庫 #${order.location_id}`;
//     const locationAddressHtml = locationResult?.formattedAddress
//         ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px; line-height: 1.4;">${locationResult.formattedAddress}</div>`
//         : "";

//     // NOTE: the Google Fonts <link> tags live directly in the initial HTML
//     // string below (not injected after the fact via JS). Combined with
//     // printing via a real popup window instead of a hidden iframe, this
//     // lets the browser load the stylesheet the same way a normal page
//     // navigation would — which is what actually loads the font reliably.
//     const htmlContent = `
//     <!DOCTYPE html>
//     <html lang="zh-TW">
//     <head>
//         <meta charset="UTF-8">
//         <title>銷售訂單 - ${title}</title>
//         <link rel="preconnect" href="https://fonts.googleapis.com">
//         <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
//         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
//         <style>
//             * {
//                 box-sizing: border-box;
//             }
//             body {
//                 /* Multi-platform Traditional Chinese System Font Stack + Web Font Fallback */
//                 font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", "微軟正黑體", sans-serif !important;
//                 padding: 40px;
//                 color: #111827;
//                 -webkit-font-smoothing: antialiased;
//             }
//             .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 24px; }
//             .title { font-size: 28px; font-weight: bold; margin: 0; }
//             .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #f3f4f6; text-transform: uppercase; }
//             .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }
//             .address-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px; background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
//             .field-label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
//             .field-value { font-size: 14px; font-weight: 500; margin-top: 4px; }
//             table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
//             th { background-color: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #374151; border-bottom: 2px solid #e5e7eb; }
//             .total-section { display: flex; justify-content: flex-end; margin-top: 24px; }
//             .total-box { width: 260px; border-top: 2px solid #111827; padding-top: 12px; }
//             .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding: 6px 0; }
//             @media print {
//                 body { padding: 0; }
//             }
//         </style>
//     </head>
//     <body>
//         <div class="header">
//             <div>
//                 <h1 class="title">銷售訂單 (Sales Order)</h1>
//                 <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 16px; font-weight: 600;"># ${title}</p>
//             </div>
//             <span class="status">${statusZh}</span>
//         </div>

//         <div class="meta-grid">
//             <div>
//                 <div class="field-label">客戶名稱</div>
//                 <div class="field-value">${customerName}</div>
//             </div>
//             <div>
//                 <div class="field-label">出貨倉庫</div>
//                 <div class="field-value">${resolvedLocationName}</div>
//                 ${locationAddressHtml}
//             </div>
//             <div>
//                 <div class="field-label">訂單建立日期</div>
//                 <div class="field-value">${order.order_created_date ? new Date(order.order_created_date).toLocaleDateString("zh-TW") : "-"}</div>
//             </div>
//             <div>
//                 <div class="field-label">預計交貨日</div>
//                 <div class="field-value">${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("zh-TW") : "-"}</div>
//             </div>
//         </div>

//         ${order.addresses && order.addresses.length > 0
//             ? `
//         <div class="address-grid">
//             <div>
//                 <div class="field-label" style="margin-bottom: 6px;">帳單地址</div>
//                 <div style="font-size: 13px; line-height: 1.5;">${formatAddress(billingAddress)}</div>
//             </div>
//             <div>
//                 <div class="field-label" style="margin-bottom: 6px;">送貨地址</div>
//                 <div style="font-size: 13px; line-height: 1.5;">${formatAddress(shippingAddress)}</div>
//             </div>
//         </div>
//         `
//             : ""
//         }

//         <table>
//             <thead>
//                 <tr>
//                     <th style="width: 40px;">#</th>
//                     <th>商品名稱 / 規格</th>
//                     <th style="text-align: center; width: 80px;">數量</th>
//                     <th style="text-align: right; width: 100px;">單價</th>
//                     <th style="text-align: right; width: 120px;">小計</th>
//                     <th style="text-align: center; width: 90px;">簽收</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${tableRowsHtml}
//             </tbody>
//         </table>

//         <div class="total-section">
//             <div class="total-box">
//                 <div class="total-row">
//                     <span>總計金額:</span>
//                     <span>${currencySymbol}${(order.total ?? 0).toFixed(2)}</span>
//                 </div>
//             </div>
//         </div>

//         ${order.additional_info
//             ? `
//         <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
//             <div class="field-label">備註事項</div>
//             <div style="font-size: 13px; margin-top: 6px; color: #374151; white-space: pre-wrap;">${order.additional_info}</div>
//         </div>
//         `
//             : ""
//         }
//     </body>
//     </html>
//     `;

//     // Write the final document into the popup window we already opened
//     // above (before the location fetch), and guard against the user having
//     // closed it while the fetch was in flight.
//     if (printWindow.closed) return;

//     const doc = printWindow.document;
//     doc.open();
//     doc.write(htmlContent);
//     doc.close();

//     const triggerPrint = () => {
//         if (printWindow.closed) return;
//         printWindow.focus();
//         printWindow.print();
//     };

//     // Close the popup automatically once the print dialog is dismissed
//     // (works whether the user prints or cancels).
//     printWindow.addEventListener("afterprint", () => {
//         printWindow.close();
//     });

//     const runWhenReady = () => {
//         // Wait for the webfont to actually be ready before printing, with a
//         // short hard-timeout fallback so a slow/blocked network never hangs
//         // printing indefinitely — it'll just fall back to system CJK fonts.
//         const ready = (async () => {
//             try {
//                 const winFonts = doc.fonts as FontFaceSet | undefined;
//                 if (winFonts) {
//                     await winFonts.load('400 14px "Noto Sans TC"').catch(() => undefined);
//                     await winFonts.ready;
//                 }
//             } catch {
//                 // Ignore — proceed to print regardless.
//             }
//         })();

//         const hardTimeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));

//         Promise.race([ready, hardTimeout]).then(triggerPrint);
//     };

//     // If the window is already loaded by the time we get here, run
//     // immediately; otherwise wait for its load event.
//     if (doc.readyState === "complete") {
//         runWhenReady();
//     } else {
//         printWindow.addEventListener("load", runWhenReady, { once: true });
//     }
// };
