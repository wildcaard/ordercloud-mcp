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
}
