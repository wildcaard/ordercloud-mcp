/**
 * MCP tool registrations for OrderCloud operations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient, OrderCloudError } from "./client.js";

// ─── Helpers ────────────────────────────────────────────────────────────

interface OcList<T = unknown> {
  Items: T[];
  Meta: { Page: number; PageSize: number; TotalCount: number; TotalPages: number };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, data }, null, 2) }] };
}

function err(e: unknown) {
  if (e instanceof OrderCloudError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ ok: false, error: { message: e.message, status: e.status, details: e.details } }, null, 2),
        },
      ],
      isError: true,
    };
  }
  const message = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: { message } }, null, 2) }], isError: true };
}

function normalizePagination(raw: OcList) {
  return {
    items: raw.Items,
    meta: {
      page: raw.Meta.Page,
      pageSize: raw.Meta.PageSize,
      totalCount: raw.Meta.TotalCount,
      totalPages: raw.Meta.TotalPages,
    },
  };
}

function buildListQuery(params: {
  search?: string;
  filters?: Record<string, string>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}): Record<string, string | number | undefined> {
  const q: Record<string, string | number | undefined> = {};
  if (params.search) q["search"] = params.search;
  if (params.page) q["page"] = params.page;
  if (params.pageSize) q["pageSize"] = params.pageSize;
  if (params.sortBy) q["sortBy"] = params.sortBy;
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      q[k] = v;
    }
  }
  return q;
}

const MAX_XP_SIZE = 65536; // 64KB

function validateXp(xp: unknown): void {
  const json = JSON.stringify(xp);
  if (json.length > MAX_XP_SIZE) {
    throw new Error(`xpPatch exceeds maximum size of ${MAX_XP_SIZE} bytes`);
  }
  if (typeof xp === "object" && xp !== null) {
    for (const key of Object.keys(xp)) {
      if (key.startsWith("$")) {
        throw new Error(`xp keys starting with "$" are not allowed: "${key}"`);
      }
    }
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── XP resource path resolver ──────────────────────────────────────────

type ResourceType = "Product" | "Category" | "Order" | "User" | "Buyer";

function resolveResourcePath(type: ResourceType, ids: Record<string, string>): string {
  switch (type) {
    case "Product":
      return `/v1/products/${ids.productId}`;
    case "Category":
      return `/v1/catalogs/${ids.catalogId}/categories/${ids.categoryId}`;
    case "Order": {
      const dir = ids.direction || "Incoming";
      return `/v1/orders/${dir}/${ids.orderId}`;
    }
    case "User":
      return `/v1/buyers/${ids.buyerId}/users/${ids.userId}`;
    case "Buyer":
      return `/v1/buyers/${ids.buyerId}`;
    default:
      throw new Error(`Unknown resource type: ${type}`);
  }
}

// ─── Tool Registration ──────────────────────────────────────────────────

export function registerTools(server: McpServer, client: OrderCloudClient): void {
  // ── A) Health & Auth ──

  server.registerTool(
    "ordercloud.ping",
    {
      description: "Check OrderCloud connectivity, auth mode, and token status",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const ping = await client.ping();
        return ok({
          baseUrl: client.baseUrl,
          authMode: client.currentAuthMode,
          tokenExpiresIn: client.tokenExpiresIn,
          connected: ping.ok,
          user: ping.user,
        });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── B) Products ──

  server.registerTool(
    "ordercloud.products.search",
    {
      description: "Search and list OrderCloud products with filtering, pagination, and sorting",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search across product fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters, e.g. {\"Active\": \"true\", \"Name\": \"Widget*\"}"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending, e.g. \"!DateCreated\""),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/products", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.get",
    {
      description: "Get a single OrderCloud product by ID",
      inputSchema: z.object({
        productId: z.string().describe("The product ID"),
      }),
    },
    async ({ productId }) => {
      try {
        const data = await client.request("GET", `/v1/products/${productId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.create",
    {
      description: "Create a new OrderCloud product",
      inputSchema: z.object({
        product: z.object({
          ID: z.string().describe("Unique product ID"),
          Name: z.string().describe("Product name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          QuantityMultiplier: z.number().int().optional(),
          ShipWeight: z.number().optional(),
          ShipHeight: z.number().optional(),
          ShipWidth: z.number().optional(),
          ShipLength: z.number().optional(),
          DefaultPriceScheduleID: z.string().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Product object to create"),
      }),
    },
    async ({ product }) => {
      try {
        const data = await client.request("POST", "/v1/products", undefined, product);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.patch",
    {
      description: "Partially update an OrderCloud product (JSON Merge Patch semantics)",
      inputSchema: z.object({
        productId: z.string().describe("The product ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"xp\": {\"color\": \"red\"}}"),
      }),
    },
    async ({ productId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/products/${productId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.delete",
    {
      description: "Delete an OrderCloud product by ID",
      inputSchema: z.object({
        productId: z.string().describe("The product ID to delete"),
      }),
    },
    async ({ productId }) => {
      try {
        await client.request("DELETE", `/v1/products/${productId}`);
        return ok({ deleted: true, productId });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── C) Catalogs & Categories ──

  server.registerTool(
    "ordercloud.catalogs.list",
    {
      description: "List OrderCloud catalogs with pagination",
      inputSchema: z.object({
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q: Record<string, number | undefined> = { page: params.page, pageSize: params.pageSize };
        const data = await client.request<OcList>("GET", "/v1/catalogs", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.search",
    {
      description: "Search categories within an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        search: z.string().optional(),
        filters: z.record(z.string()).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", `/v1/catalogs/${params.catalogId}/categories`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.get",
    {
      description: "Get a single category from an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        categoryId: z.string().describe("The category ID"),
      }),
    },
    async ({ catalogId, categoryId }) => {
      try {
        const data = await client.request("GET", `/v1/catalogs/${catalogId}/categories/${categoryId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── D) Buyers & Users ──

  server.registerTool(
    "ordercloud.buyers.search",
    {
      description: "Search OrderCloud buyer organizations",
      inputSchema: z.object({
        search: z.string().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/buyers", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.search",
    {
      description: "Search users within an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        search: z.string().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", `/v1/buyers/${params.buyerId}/users`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.get",
    {
      description: "Get a single user from an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        userId: z.string().describe("The user ID"),
      }),
    },
    async ({ buyerId, userId }) => {
      try {
        const data = await client.request("GET", `/v1/buyers/${buyerId}/users/${userId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── E) Orders ──

  server.registerTool(
    "ordercloud.orders.search",
    {
      description: "Search OrderCloud orders with direction, status, date range, filtering, and pagination",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction: Incoming (seller view) or Outgoing (buyer view)"),
        search: z.string().optional().describe("Keyword search"),
        status: z.string().optional().describe("Filter by order status, e.g. Open, AwaitingApproval, Completed"),
        from: z.string().optional().describe("Start date filter (ISO 8601), maps to FromDate"),
        to: z.string().optional().describe("End date filter (ISO 8601), maps to ToDate"),
        filters: z.record(z.string()).optional().describe("Additional field-level filters"),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery({
          search: params.search,
          filters: params.filters,
          page: params.page,
          pageSize: params.pageSize,
        });
        if (params.status) q["Status"] = params.status;
        if (params.from) q["from"] = params.from;
        if (params.to) q["to"] = params.to;
        const data = await client.request<OcList>("GET", `/v1/orders/${params.direction}`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.orders.get",
    {
      description: "Get a single OrderCloud order by ID and direction",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
      }),
    },
    async ({ direction, orderId }) => {
      try {
        const data = await client.request("GET", `/v1/orders/${direction}/${orderId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.orders.getWorksheet",
    {
      description: "Get the full order worksheet (order + line items + promotions + payments) for an OrderCloud order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
      }),
    },
    async ({ direction, orderId }) => {
      try {
        const [order, lineItems, payments] = await Promise.all([
          client.request("GET", `/v1/orders/${direction}/${orderId}`),
          client.request<OcList>("GET", `/v1/orders/${direction}/${orderId}/lineitems`),
          client.request<OcList>("GET", `/v1/orders/${direction}/${orderId}/payments`),
        ]);
        return ok({
          order,
          lineItems: lineItems.Items,
          payments: payments.Items,
        });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── F) XP Helpers ──

  server.registerTool(
    "ordercloud.xp.get",
    {
      description: "Read extended properties (xp) from any OrderCloud resource (Product, Category, Order, User, Buyer)",
      inputSchema: z.object({
        resourceType: z.enum(["Product", "Category", "Order", "User", "Buyer"]).describe("The resource type"),
        identifiers: z.record(z.string()).describe(
          "Resource identifiers, e.g. {\"productId\": \"abc\"} or {\"catalogId\": \"cat1\", \"categoryId\": \"categ1\"}"
        ),
      }),
    },
    async ({ resourceType, identifiers }) => {
      try {
        const path = resolveResourcePath(resourceType, identifiers);
        const data = await client.request<{ xp?: unknown }>("GET", path);
        return ok({ xp: data.xp ?? {} });
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.xp.patch",
    {
      description: "Safely update extended properties (xp) on any OrderCloud resource with deep merge. Rejects keys starting with dollar sign and payloads over 64KB.",
      inputSchema: z.object({
        resourceType: z.enum(["Product", "Category", "Order", "User", "Buyer"]).describe("The resource type"),
        identifiers: z.record(z.string()).describe(
          "Resource identifiers, e.g. {\"productId\": \"abc\"}"
        ),
        xpPatch: z.record(z.unknown()).describe("XP fields to merge into the existing xp object"),
      }),
    },
    async ({ resourceType, identifiers, xpPatch }) => {
      try {
        validateXp(xpPatch);
        const path = resolveResourcePath(resourceType, identifiers);
        const existing = await client.request<{ xp?: Record<string, unknown> }>("GET", path);
        const merged = deepMerge(existing.xp ?? {}, xpPatch as Record<string, unknown>);
        const updated = await client.request("PATCH", path, undefined, { xp: merged });
        return ok(updated);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── G) Suppliers ──

  server.registerTool(
    "ordercloud.suppliers.search",
    {
      description: "Search OrderCloud suppliers",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search"),
        filters: z.record(z.string()).optional().describe("Field-level filters"),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        sortBy: z.string().optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/suppliers", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.get",
    {
      description: "Get a single OrderCloud supplier by ID",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID"),
      }),
    },
    async ({ supplierId }) => {
      try {
        const data = await client.request("GET", `/v1/suppliers/${supplierId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.create",
    {
      description: "Create a new OrderCloud supplier",
      inputSchema: z.object({
        supplier: z.object({
          ID: z.string().describe("Unique supplier ID"),
          Name: z.string().describe("Supplier name"),
          Active: z.boolean().optional().default(true),
          xp: z.record(z.unknown()).optional(),
        }).describe("Supplier object to create"),
      }),
    },
    async ({ supplier }) => {
      try {
        const data = await client.request("POST", "/v1/suppliers", undefined, supplier);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.patch",
    {
      description: "Partially update an OrderCloud supplier",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ supplierId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/suppliers/${supplierId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.delete",
    {
      description: "Delete an OrderCloud supplier by ID",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID to delete"),
      }),
    },
    async ({ supplierId }) => {
      try {
        await client.request("DELETE", `/v1/suppliers/${supplierId}`);
        return ok({ deleted: true, supplierId });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── H) Addresses ──

  server.registerTool(
    "ordercloud.addresses.listForEntity",
    {
      description: "List addresses for a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["Buyer", "Supplier"]).describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ entityType, entityId, page, pageSize }) => {
      try {
        const path = entityType === "Buyer" 
          ? `/v1/buyers/${entityId}/addresses` 
          : `/v1/suppliers/${entityId}/addresses`;
        const q: Record<string, number | undefined> = { page, pageSize };
        const data = await client.request<OcList>("GET", path, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.get",
    {
      description: "Get an address from a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["Buyer", "Supplier"]).describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        addressId: z.string().describe("Address ID"),
      }),
    },
    async ({ entityType, entityId, addressId }) => {
      try {
        const path = entityType === "Buyer" 
          ? `/v1/buyers/${entityId}/addresses/${addressId}` 
          : `/v1/suppliers/${entityId}/addresses/${addressId}`;
        const data = await client.request("GET", path);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.create",
    {
      description: "Create an address for a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["Buyer", "Supplier"]).describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        address: z.object({
          ID: z.string().optional(),
          AddressName: z.string().optional(),
          Street1: z.string(),
          Street2: z.string().optional(),
          City: z.string().optional(),
          State: z.string().optional(),
          Zip: z.string().optional(),
          Country: z.string().optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Address object to create"),
      }),
    },
    async ({ entityType, entityId, address }) => {
      try {
        const path = entityType === "Buyer" 
          ? `/v1/buyers/${entityId}/addresses` 
          : `/v1/suppliers/${entityId}/addresses`;
        const data = await client.request("POST", path, undefined, address);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.patch",
    {
      description: "Partially update an address",
      inputSchema: z.object({
        entityType: z.enum(["Buyer", "Supplier"]).describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        addressId: z.string().describe("Address ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ entityType, entityId, addressId, patch }) => {
      try {
        const path = entityType === "Buyer" 
          ? `/v1/buyers/${entityId}/addresses/${addressId}` 
          : `/v1/suppliers/${entityId}/addresses/${addressId}`;
        const data = await client.request("PATCH", path, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.delete",
    {
      description: "Delete an address",
      inputSchema: z.object({
        entityType: z.enum(["Buyer", "Supplier"]).describe("Entity type"),
        entityId: z.string().describe("Entity ID"),
        addressId: z.string().describe("Address ID"),
      }),
    },
    async ({ entityType, entityId, addressId }) => {
      try {
        const path = entityType === "Buyer" 
          ? `/v1/buyers/${entityId}/addresses/${addressId}` 
          : `/v1/suppliers/${entityId}/addresses/${addressId}`;
        await client.request("DELETE", path);
        return ok({ deleted: true, addressId, entityType, entityId });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── I) Price Schedules ──

  server.registerTool(
    "ordercloud.priceSchedules.list",
    {
      description: "List OrderCloud price schedules",
      inputSchema: z.object({
        productId: z.string().optional().describe("Filter by product ID"),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ productId, page, pageSize }) => {
      try {
        const q: Record<string, string | number | undefined> = {};
        if (productId) q["productID"] = productId;
        if (page) q["page"] = page;
        if (pageSize) q["pageSize"] = pageSize;
        const data = await client.request<OcList>("GET", "/v1/priceSchedules", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.priceSchedules.get",
    {
      description: "Get a price schedule by ID",
      inputSchema: z.object({
        priceScheduleId: z.string().describe("The price schedule ID"),
      }),
    },
    async ({ priceScheduleId }) => {
      try {
        const data = await client.request("GET", `/v1/priceSchedules/${priceScheduleId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.priceSchedules.create",
    {
      description: "Create a new price schedule",
      inputSchema: z.object({
        priceSchedule: z.object({
          ID: z.string().describe("Unique price schedule ID"),
          Name: z.string().describe("Price schedule name"),
          ProductID: z.string().describe("Associated product ID"),
          PriceBreaks: z.array(z.object({
            Quantity: z.number().int(),
            Price: z.number(),
            SalePrice: z.number().optional(),
          })).optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Price schedule object to create"),
      }),
    },
    async ({ priceSchedule }) => {
      try {
        const data = await client.request("POST", "/v1/priceSchedules", undefined, priceSchedule);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.priceSchedules.patch",
    {
      description: "Partially update a price schedule",
      inputSchema: z.object({
        priceScheduleId: z.string().describe("The price schedule ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ priceScheduleId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/priceSchedules/${priceScheduleId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.priceSchedules.addPriceBreak",
    {
      description: "Add a price break to a price schedule",
      inputSchema: z.object({
        priceScheduleId: z.string().describe("The price schedule ID"),
        priceBreak: z.object({
          Quantity: z.number().int().describe("Minimum quantity"),
          Price: z.number().describe("Unit price"),
          SalePrice: z.number().optional().describe("Sale price"),
        }).describe("Price break to add"),
      }),
    },
    async ({ priceScheduleId, priceBreak }) => {
      try {
        const data = await client.request("POST", `/v1/priceSchedules/${priceScheduleId}/pricebreaks`, undefined, priceBreak);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── J) Promotions ──

  server.registerTool(
    "ordercloud.promotions.search",
    {
      description: "Search OrderCloud promotions",
      inputSchema: z.object({
        search: z.string().optional(),
        filters: z.record(z.string()).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/promotions", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.get",
    {
      description: "Get a promotion by ID",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
      }),
    },
    async ({ promotionId }) => {
      try {
        const data = await client.request("GET", `/v1/promotions/${promotionId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.create",
    {
      description: "Create a new promotion",
      inputSchema: z.object({
        promotion: z.object({
          ID: z.string().describe("Unique promotion ID"),
          Code: z.string().describe("Promotion code"),
          Name: z.string().describe("Promotion name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          StartDate: z.string().optional(),
          ExpirationDate: z.string().optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Promotion object to create"),
      }),
    },
    async ({ promotion }) => {
      try {
        const data = await client.request("POST", "/v1/promotions", undefined, promotion);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.patch",
    {
      description: "Partially update a promotion",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ promotionId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/promotions/${promotionId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.delete",
    {
      description: "Delete a promotion",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
      }),
    },
    async ({ promotionId }) => {
      try {
        await client.request("DELETE", `/v1/promotions/${promotionId}`);
        return ok({ deleted: true, promotionId });
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.assignToBuyer",
    {
      description: "Assign a promotion to a buyer",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
        buyerId: z.string().describe("The buyer ID"),
      }),
    },
    async ({ promotionId, buyerId }) => {
      try {
        const data = await client.request("POST", `/v1/promotions/${promotionId}/assignments`, undefined, { BuyerID: buyerId });
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── K) Shipments ──

  server.registerTool(
    "ordercloud.shipments.search",
    {
      description: "Search OrderCloud shipments",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).optional().describe("Shipment direction"),
        search: z.string().optional(),
        filters: z.record(z.string()).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/shipments", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.get",
    {
      description: "Get a shipment by ID",
      inputSchema: z.object({
        shipmentId: z.string().describe("The shipment ID"),
      }),
    },
    async ({ shipmentId }) => {
      try {
        const data = await client.request("GET", `/v1/shipments/${shipmentId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.create",
    {
      description: "Create a new shipment",
      inputSchema: z.object({
        shipment: z.object({
          ID: z.string().optional(),
          Shipper: z.string().optional(),
          TrackingNumber: z.string().optional(),
          DateShipped: z.string().optional(),
          DateDelivered: z.string().optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Shipment object to create"),
      }),
    },
    async ({ shipment }) => {
      try {
        const data = await client.request("POST", "/v1/shipments", undefined, shipment);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.patch",
    {
      description: "Partially update a shipment",
      inputSchema: z.object({
        shipmentId: z.string().describe("The shipment ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ shipmentId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/shipments/${shipmentId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.listForOrder",
    {
      description: "List shipments for an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
      }),
    },
    async ({ direction, orderId }) => {
      try {
        const data = await client.request<OcList>("GET", `/v1/orders/${direction}/${orderId}/shipments`);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.addLineItem",
    {
      description: "Add a line item to a shipment",
      inputSchema: z.object({
        shipmentId: z.string().describe("The shipment ID"),
        lineItem: z.object({
          OrderID: z.string().describe("Order ID"),
          LineItemID: z.string().describe("Line item ID"),
          Quantity: z.number().int().describe("Quantity shipped"),
        }).describe("Line item to add"),
      }),
    },
    async ({ shipmentId, lineItem }) => {
      try {
        const data = await client.request("POST", `/v1/shipments/${shipmentId}/items`, undefined, lineItem);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── L) Payments ──

  server.registerTool(
    "ordercloud.payments.listForOrder",
    {
      description: "List payments for an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
      }),
    },
    async ({ direction, orderId }) => {
      try {
        const data = await client.request<OcList>("GET", `/v1/orders/${direction}/${orderId}/payments`);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.get",
    {
      description: "Get a payment by ID",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        paymentId: z.string().describe("The payment ID"),
      }),
    },
    async ({ direction, orderId, paymentId }) => {
      try {
        const data = await client.request("GET", `/v1/orders/${direction}/${orderId}/payments/${paymentId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.create",
    {
      description: "Create a payment for an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        payment: z.object({
          Type: z.string().describe("Payment type"),
          Amount: z.number().optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Payment object to create"),
      }),
    },
    async ({ direction, orderId, payment }) => {
      try {
        const data = await client.request("POST", `/v1/orders/${direction}/${orderId}/payments`, undefined, payment);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.patch",
    {
      description: "Partially update a payment",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        paymentId: z.string().describe("The payment ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ direction, orderId, paymentId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/orders/${direction}/${orderId}/payments/${paymentId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.transactions.list",
    {
      description: "List transactions for a payment",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        paymentId: z.string().describe("The payment ID"),
      }),
    },
    async ({ direction, orderId, paymentId }) => {
      try {
        const data = await client.request<OcList>("GET", `/v1/orders/${direction}/${orderId}/payments/${paymentId}/transactions`);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── M) Line Items ──

  server.registerTool(
    "ordercloud.lineItems.list",
    {
      description: "List line items for an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        search: z.string().optional(),
        filters: z.record(z.string()).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", `/v1/orders/${params.direction}/${params.orderId}/lineitems`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.get",
    {
      description: "Get a line item by ID",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        lineItemId: z.string().describe("The line item ID"),
      }),
    },
    async ({ direction, orderId, lineItemId }) => {
      try {
        const data = await client.request("GET", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.create",
    {
      description: "Add a line item to an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        lineItem: z.object({
          ProductID: z.string().describe("Product ID"),
          Quantity: z.number().int().describe("Quantity"),
          UnitPrice: z.number().optional(),
          xp: z.record(z.unknown()).optional(),
        }).describe("Line item to create"),
      }),
    },
    async ({ direction, orderId, lineItem }) => {
      try {
        const data = await client.request("POST", `/v1/orders/${direction}/${orderId}/lineitems`, undefined, lineItem);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.patch",
    {
      description: "Partially update a line item",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        lineItemId: z.string().describe("The line item ID"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ direction, orderId, lineItemId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.delete",
    {
      description: "Delete a line item from an order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID"),
        lineItemId: z.string().describe("The line item ID"),
      }),
    },
    async ({ direction, orderId, lineItemId }) => {
      try {
        await client.request("DELETE", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`);
        return ok({ deleted: true, lineItemId, orderId });
      } catch (e) {
        return err(e);
      }
    }
  );
}
