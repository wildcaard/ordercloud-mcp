/**
 * Order tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all order-related tools.
 */
export function registerOrderTools(server: McpServer, client: OrderCloudClient): void {
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
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
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
    "ordercloud.orders.create",
    {
      description: "Create a new OrderCloud order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        order: z.object({
          ID: z.string().optional().describe("Order ID (optional, auto-generated if not provided)"),
          Name: z.string().optional().describe("Order name"),
          CustomerID: z.string().optional().describe("Customer ID"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Order object to create"),
      }),
    },
    async ({ direction, order }) => {
      const params = { direction, order };
      try {
        const data = await client.request<{ ID?: string }>("POST", `/v1/orders/${direction}`, undefined, order);
        const resourceId = data.ID ?? (order as { ID?: string }).ID;
        recordAudit({ operation: "create", toolName: "ordercloud.orders.create", resourceType: "Order", resourceId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.orders.create", resourceType: "Order", resourceId: (order as { ID?: string }).ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.orders.patch",
    {
      description: "Partially update an OrderCloud order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ direction, orderId, patch }) => {
      const params = { direction, orderId, patch };
      try {
        const data = await client.request("PATCH", `/v1/orders/${direction}/${orderId}`, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.orders.patch", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.orders.patch", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.orders.delete",
    {
      description: "Delete an OrderCloud order",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID to delete"),
      }),
    },
    async ({ direction, orderId }) => {
      const params = { direction, orderId };
      try {
        await client.request("DELETE", `/v1/orders/${direction}/${orderId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.orders.delete", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, direction, orderId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.orders.delete", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
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

  server.registerTool(
    "ordercloud.orders.submit",
    {
      description: "Submit an OrderCloud order for processing",
      inputSchema: z.object({
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        orderId: z.string().describe("The order ID to submit"),
      }),
    },
    async ({ direction, orderId }) => {
      const params = { direction, orderId };
      try {
        const data = await client.request("POST", `/v1/orders/${direction}/${orderId}/submit`);
        recordAudit({ operation: "update", toolName: "ordercloud.orders.submit", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.orders.submit", resourceType: "Order", resourceId: orderId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
