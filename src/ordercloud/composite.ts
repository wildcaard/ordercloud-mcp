/**
 * Phase 4: Composite/Chained tools — multi-step operations in a single tool call.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "./client.js";
import { ok, err } from "./helpers/index.js";
import { recordAudit, sanitizeForAudit } from "./helpers/audit.js";

/** Result shape for createFull */
interface CreateFullResult {
  product: unknown;
  priceSchedule?: unknown;
  specsCreated?: number;
  variantsGenerated?: number;
  categoryAssignments?: number;
  errors?: string[];
}

/** Result shape for fulfill */
interface FulfillResult {
  orderId: string;
  direction: "Incoming" | "Outgoing";
  worksheet?: unknown;
  shipment?: unknown;
  orderPatched?: unknown;
  errors?: string[];
}

/** Result shape for onboard */
interface OnboardResult {
  buyer: unknown;
  user?: unknown;
  address?: unknown;
  defaultCatalogAssigned?: boolean;
  errors?: string[];
}

/** Result shape for bulkActivate */
interface BulkActivateResult {
  total: number;
  succeeded: number;
  failed: number;
  productIds: string[];
  errors: { productId: string; message: string }[];
}

/** Result shape for generateReport */
interface OrderReportResult {
  fromDate?: string;
  toDate?: string;
  orderCount: number;
  totalRevenue: number;
  statusBreakdown: Record<string, number>;
  orders: unknown[];
  errors?: string[];
}

export function registerCompositeTools(server: McpServer, client: OrderCloudClient): void {
  // ─── 4.1 Product Creation with Full Setup ─────────────────────────────────
  server.registerTool(
    "ordercloud.products.createFull",
    {
      description:
        "Create a product with default price schedule, optional specs/options, variant generation, and category assignments in one call",
      inputSchema: z.object({
        productId: z.string().describe("Unique product ID"),
        name: z.string().describe("Product name"),
        description: z.string().optional().describe("Product description"),
        price: z.number().describe("Default unit price"),
        currency: z.string().optional().default("USD").describe("Currency code"),
        specs: z
          .array(
            z.object({
              specId: z.string().describe("Spec ID"),
              specName: z.string().describe("Spec name"),
              options: z.array(z.string()).describe("Option values (option IDs will be derived)"),
            })
          )
          .optional()
          .describe("Specs to create and assign to product"),
        categoryIds: z
          .array(z.object({ catalogId: z.string(), categoryId: z.string() }))
          .optional()
          .describe("Category assignments (catalogId + categoryId per category)"),
      }),
    },
    async (params): Promise<ReturnType<typeof ok>> => {
      const result: CreateFullResult = { product: null };
      const errors: string[] = [];
      try {
        // 1. Create product
        const productPayload = {
          ID: params.productId,
          Name: params.name,
          Description: params.description ?? "",
          Active: true,
        };
        const product = await client.request("POST", "/v1/products", undefined, productPayload);
        result.product = product;

        // 2. Create default price schedule and set on product
        const priceScheduleId = `${params.productId}-default`;
        const priceSchedulePayload = {
          ID: priceScheduleId,
          Name: `${params.productId} Default Price`,
          ProductID: params.productId,
          Currency: params.currency ?? "USD",
          PriceBreaks: [{ Quantity: 1, Price: params.price }],
        };
        await client.request("POST", "/v1/priceSchedules", undefined, priceSchedulePayload);
        await client.request("PATCH", `/v1/products/${params.productId}`, undefined, {
          DefaultPriceScheduleID: priceScheduleId,
        });
        result.priceSchedule = { id: priceScheduleId, price: params.price };

        // 3. Create specs and assign to product (if provided)
        if (params.specs && params.specs.length > 0) {
          let specsCreated = 0;
          for (const spec of params.specs) {
            try {
              await client.request("POST", "/v1/specs", undefined, {
                ID: spec.specId,
                Name: spec.specName,
                Active: true,
                DefinesVariant: true,
                Required: true,
              });
              specsCreated++;
              await client.request("POST", `/v1/products/${params.productId}/specs`, undefined, {
                SpecID: spec.specId,
              });
              for (let i = 0; i < spec.options.length; i++) {
                const optId = `${spec.specId}-${spec.options[i].replace(/\s+/g, "-")}-${i}`;
                await client.request("POST", `/v1/specs/${spec.specId}/options`, undefined, {
                  ID: optId,
                  Value: spec.options[i],
                });
              }
            } catch (e) {
              errors.push(`Spec ${spec.specId}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          result.specsCreated = specsCreated;
          // 4. Generate variants if we have specs (OrderCloud POST .../variants/generate)
          if (specsCreated > 0) {
            try {
              const variantResult = await client.request<{ VariantsGenerated?: number }>(
                "POST",
                `/v1/products/${params.productId}/variants/generate`,
                undefined,
                {}
              );
              result.variantsGenerated = variantResult.VariantsGenerated ?? 0;
            } catch {
              result.variantsGenerated = 0;
            }
          }
        }

        // 5. Assign to categories
        if (params.categoryIds && params.categoryIds.length > 0) {
          let assigned = 0;
          for (const { catalogId, categoryId } of params.categoryIds) {
            try {
              await client.request(
                "POST",
                `/v1/catalogs/${catalogId}/categories/${categoryId}/productassignments`,
                undefined,
                { ProductID: params.productId }
              );
              assigned++;
            } catch (e) {
              errors.push(`Category ${catalogId}/${categoryId}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          result.categoryAssignments = assigned;
        }

        if (errors.length > 0) result.errors = errors;
        recordAudit({ operation: "create", toolName: "ordercloud.products.createFull", resourceType: "Product", resourceId: params.productId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(result);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.products.createFull", resourceType: "Product", resourceId: params.productId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  // ─── 4.2 Order Fulfillment Workflow ────────────────────────────────────────
  server.registerTool(
    "ordercloud.orders.fulfill",
    {
      description:
        "Get order worksheet, create a shipment for the order, add line items to shipment, and optionally update order/shipment status",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("Order ID to fulfill"),
        shipper: z.string().optional().default("Default").describe("Shipper/carrier name"),
        shipmentId: z.string().optional().describe("Shipment ID (auto-generated from orderId if omitted)"),
        updateOrderStatus: z.string().optional().describe("Optional order status to set after creating shipment (e.g. Processing)"),
      }),
    },
    async (params): Promise<ReturnType<typeof ok>> => {
      const result: FulfillResult = { orderId: params.orderId, direction: params.direction };
      const errors: string[] = [];
      try {
        // 1. Get order worksheet
        const [order, lineItemsResp] = await Promise.all([
          client.request("GET", `/v1/orders/${params.direction}/${params.orderId}`),
          client.request("GET", `/v1/orders/${params.direction}/${params.orderId}/lineitems`),
        ]);
        result.worksheet = { order, lineItems: (lineItemsResp as { Items?: unknown[] }).Items ?? [] };

        const orderObj = order as { Status?: string };
        const lineItems = (lineItemsResp as { Items?: { ID: string; Quantity: number }[] }).Items ?? [];

        // 2. Validate: ensure order is in a fulfillable state (e.g. not Unsubmitted)
        if (orderObj.Status === "Unsubmitted") {
          const msg = "Order is unsubmitted; submit the order before fulfilling.";
          recordAudit({ operation: "update", toolName: "ordercloud.orders.fulfill", resourceType: "Order", resourceId: params.orderId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: msg });
          return err(new Error(msg));
        }

        // 3. Create shipment
        const shipmentId = params.shipmentId ?? `ship-${params.orderId}-${Date.now()}`;
        const shipmentPayload = {
          ID: shipmentId,
          OrderID: params.orderId,
          Shipper: params.shipper ?? "Default",
        };
        const shipment = await client.request("POST", "/v1/shipments", undefined, shipmentPayload);
        result.shipment = shipment;

        // 4. Add line items to shipment
        for (const li of lineItems) {
          try {
            await client.request("POST", `/v1/shipments/${shipmentId}/items`, undefined, {
              OrderID: params.orderId,
              LineItemID: li.ID,
              QuantityShipped: li.Quantity ?? 1,
            });
          } catch (e) {
            errors.push(`LineItem ${li.ID}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // 5. Update order status if requested
        if (params.updateOrderStatus) {
          const patched = await client.request(
            "PATCH",
            `/v1/orders/${params.direction}/${params.orderId}`,
            undefined,
            { Status: params.updateOrderStatus }
          );
          result.orderPatched = patched;
        }

        if (errors.length > 0) result.errors = errors;
        recordAudit({ operation: "update", toolName: "ordercloud.orders.fulfill", resourceType: "Order", resourceId: params.orderId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(result);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.orders.fulfill", resourceType: "Order", resourceId: params.orderId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  // ─── 4.3 Customer Onboarding ──────────────────────────────────────────────
  server.registerTool(
    "ordercloud.customers.onboard",
    {
      description:
        "Create a buyer organization, default user, default address, and assign default catalog in one call",
      inputSchema: z.object({
        buyerId: z.string().describe("Unique buyer ID"),
        buyerName: z.string().describe("Buyer organization name"),
        userId: z.string().describe("Default user ID"),
        username: z.string().describe("Default username"),
        email: z.string().describe("Default user email"),
        firstName: z.string().optional().describe("Default user first name"),
        lastName: z.string().optional().describe("Default user last name"),
        addressId: z.string().describe("Default address ID"),
        street1: z.string().describe("Address street line 1"),
        city: z.string().describe("Address city"),
        state: z.string().describe("Address state/province"),
        country: z.string().describe("Address country code"),
        zip: z.string().optional().describe("Address postal code"),
        defaultCatalogId: z.string().optional().describe("Catalog ID to set as buyer default"),
      }),
    },
    async (params): Promise<ReturnType<typeof ok>> => {
      const result: OnboardResult = { buyer: null };
      const errors: string[] = [];
      try {
        // 1. Create buyer
        const buyer = await client.request("POST", "/v1/buyers", undefined, {
          ID: params.buyerId,
          Name: params.buyerName,
          Active: true,
        });
        result.buyer = buyer;

        // 2. Create default user
        const user = await client.request("POST", `/v1/buyers/${params.buyerId}/users`, undefined, {
          ID: params.userId,
          Username: params.username,
          Email: params.email,
          FirstName: params.firstName ?? "",
          LastName: params.lastName ?? "",
          Active: true,
        });
        result.user = user;

        // 3. Create default address (buyer-level)
        const address = await client.request("POST", `/v1/buyers/${params.buyerId}/addresses`, undefined, {
          ID: params.addressId,
          Street1: params.street1,
          City: params.city,
          State: params.state,
          Country: params.country,
          Zip: params.zip ?? "",
        });
        result.address = address;

        // 4. Assign default catalog to buyer
        if (params.defaultCatalogId) {
          await client.request("PATCH", `/v1/buyers/${params.buyerId}`, undefined, {
            DefaultCatalogID: params.defaultCatalogId,
          });
          result.defaultCatalogAssigned = true;
        }

        if (errors.length > 0) result.errors = errors;
        recordAudit({ operation: "create", toolName: "ordercloud.customers.onboard", resourceType: "Buyer", resourceId: params.buyerId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(result);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.customers.onboard", resourceType: "Buyer", resourceId: params.buyerId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  // ─── 4.4 Product Bulk Activate ─────────────────────────────────────────────
  server.registerTool(
    "ordercloud.products.bulkActivate",
    {
      description: "Set Active=true for a list of products; returns success/failure summary",
      inputSchema: z.object({
        productIds: z.array(z.string()).describe("List of product IDs to activate"),
        batchSize: z.number().int().min(1).max(50).optional().default(10).describe("Number of products to patch per batch (sequential)"),
      }),
    },
    async (params): Promise<ReturnType<typeof ok>> => {
      const summary: BulkActivateResult = {
        total: params.productIds.length,
        succeeded: 0,
        failed: 0,
        productIds: params.productIds,
        errors: [],
      };
      try {
        const batchSize = params.batchSize ?? 10;
        for (let i = 0; i < params.productIds.length; i += batchSize) {
          const batch = params.productIds.slice(i, i + batchSize);
          for (const productId of batch) {
            try {
              await client.request("PATCH", `/v1/products/${productId}`, undefined, { Active: true });
              summary.succeeded++;
            } catch (e) {
              summary.failed++;
              summary.errors.push({
                productId,
                message: e instanceof Error ? e.message : String(e),
              });
            }
          }
        }
        recordAudit({ operation: "update", toolName: "ordercloud.products.bulkActivate", resourceType: "Product", resourceId: params.productIds[0], paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(summary);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.products.bulkActivate", resourceType: "Product", paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  // ─── 4.5 Order Analytics Report ───────────────────────────────────────────
  server.registerTool(
    "ordercloud.orders.generateReport",
    {
      description: "Search orders in a date range, fetch worksheets, and return aggregated metrics (totals, status breakdown)",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        fromDate: z.string().optional().describe("Start date (ISO 8601 or YYYY-MM-DD)"),
        toDate: z.string().optional().describe("End date (ISO 8601 or YYYY-MM-DD)"),
        pageSize: z.number().int().min(1).max(100).optional().default(50).describe("Max orders to include"),
        status: z.string().optional().describe("Filter by order status"),
      }),
    },
    async (params): Promise<ReturnType<typeof ok>> => {
      const result: OrderReportResult = {
        orderCount: 0,
        totalRevenue: 0,
        statusBreakdown: {},
        orders: [],
      };
      const errors: string[] = [];
      try {
        const q: Record<string, string | number | undefined> = {
          page: 1,
          pageSize: params.pageSize ?? 50,
        };
        if (params.fromDate) q["from"] = params.fromDate;
        if (params.toDate) q["to"] = params.toDate;
        if (params.status) q["Status"] = params.status;
        result.fromDate = params.fromDate;
        result.toDate = params.toDate;

        const listResp = await client.request("GET", `/v1/orders/${params.direction}`, q);
        const meta = (listResp as { Meta?: { TotalCount: number } }).Meta;
        const items = (listResp as { Items?: { ID: string; Total?: number; Status?: string }[] }).Items ?? [];
        result.orderCount = meta?.TotalCount ?? items.length;
        result.orders = items;

        let totalRevenue = 0;
        const statusBreakdown: Record<string, number> = {};
        for (const order of items) {
          totalRevenue += order.Total ?? 0;
          const status = order.Status ?? "Unknown";
          statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
        }
        result.totalRevenue = totalRevenue;
        result.statusBreakdown = statusBreakdown;

        if (errors.length > 0) result.errors = errors;
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );
}
