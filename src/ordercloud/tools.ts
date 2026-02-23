/**
 * MCP tool registrations for OrderCloud operations.
 * 
 * This file serves as the main registration point, importing specialized
 * modules for each resource type. See /resources/ for individual modules.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "./client.js";
import { ok, err, buildListQuery, normalizePagination, OcList, resolveResourcePath, validateXp, deepMerge } from "./helpers/index.js";

// Import resource modules
import { registerProductTools } from "./resources/products.js";

// ─── Tool Registration ──────────────────────────────────────────────────────

export function registerTools(server: McpServer, client: OrderCloudClient): void {
  // ── A) Health & Auth ──
  // Keep ping inline as it's a simple tool

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
  // Using modular approach - all product tools in resources/products.ts
  registerProductTools(server, client);

  // ── C) Catalogs & Categories ──
  // (Still inlined - will be moved to resources/catalogs.ts in next iteration)

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
        from: z.string().optional().describe("Start date filter (ISO 8601)"),
        to: z.string().optional().describe("End date filter (ISO 8601)"),
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
        identifiers: z.record(z.string()).describe("Resource identifiers, e.g. {\"productId\": \"abc\"}"),
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
      description: "Safely update extended properties (xp) on any OrderCloud resource with deep merge",
      inputSchema: z.object({
        resourceType: z.enum(["Product", "Category", "Order", "User", "Buyer"]).describe("The resource type"),
        identifiers: z.record(z.string()).describe("Resource identifiers, e.g. {\"productId\": \"abc\"}"),
        xpPatch: z.record(z.unknown()).describe("XP fields to merge into the existing xp object"),
      }),
    },
    async ({ resourceType, identifiers, xpPatch }) => {
      try {
        // Validate XP first
        validateXp(xpPatch);
        
        // Get current XP
        const path = resolveResourcePath(resourceType, identifiers);
        const current = await client.request<{ xp?: Record<string, unknown> }>("GET", path);
        
        // Merge and update
        const mergedXp = deepMerge(current.xp || {}, xpPatch);
        const data = await client.request("PATCH", path, undefined, { xp: mergedXp });
        
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );
}
