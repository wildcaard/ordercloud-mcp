/**
 * Line Item tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Line Item entity.
 */
interface LineItem {
  ID: string;
  OrderID: string;
  ProductID?: string;
  Quantity: number;
  UnitPrice?: number;
  LineTotal?: number;
  CostCenter?: string;
  DateAdded?: string;
  Product?: Record<string, unknown>;
  Variant?: Record<string, unknown>;
  xp?: Record<string, unknown>;
}

/**
 * Register all line item-related tools.
 */
export function registerLineItemTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.lineItems.list",
    {
      description: "List all line items for a specific order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        search: z.string().optional().describe("Keyword search"),
        filters: z.record(z.string()).optional().describe("Field-level filters"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<LineItem>>("GET", `/v1/orders/${params.direction}/${params.orderId}/lineitems`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.get",
    {
      description: "Get a single line item from an order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        lineItemId: z.string().describe("The line item ID"),
      }),
    },
    async ({ orderId, direction, lineItemId }) => {
      try {
        const data = await client.request<LineItem>("GET", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.create",
    {
      description: "Add a new line item to an order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        lineItem: z.object({
          ProductID: z.string().describe("Product ID"),
          Quantity: z.number().int().min(1).describe("Quantity to order"),
          UnitPrice: z.number().optional().describe("Unit price (if overriding product price)"),
          CostCenter: z.string().optional().describe("Cost center for the line item"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Line item object to create"),
      }),
    },
    async ({ orderId, direction, lineItem }) => {
      const params = { orderId, direction, lineItem };
      try {
        const data = await client.request<LineItem>("POST", `/v1/orders/${direction}/${orderId}/lineitems`, undefined, lineItem);
        recordAudit({ operation: "create", toolName: "ordercloud.lineItems.create", resourceType: "LineItem", resourceId: data.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.lineItems.create", resourceType: "LineItem", paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.patch",
    {
      description: "Update a line item (partial update)",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        lineItemId: z.string().describe("The line item ID to update"),
        lineItem: z.object({
          Quantity: z.number().int().min(1).optional().describe("Updated quantity"),
          UnitPrice: z.number().optional().describe("Updated unit price"),
          CostCenter: z.string().optional().describe("Updated cost center"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial line item object with fields to update"),
      }),
    },
    async ({ orderId, direction, lineItemId, lineItem }) => {
      const params = { orderId, direction, lineItemId, lineItem };
      try {
        const data = await client.request<LineItem>("PATCH", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`, undefined, lineItem);
        recordAudit({ operation: "update", toolName: "ordercloud.lineItems.patch", resourceType: "LineItem", resourceId: lineItemId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.lineItems.patch", resourceType: "LineItem", resourceId: lineItemId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.lineItems.delete",
    {
      description: "Remove a line item from an order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        lineItemId: z.string().describe("The line item ID to delete"),
      }),
    },
    async ({ orderId, direction, lineItemId }) => {
      const params = { orderId, direction, lineItemId };
      try {
        await client.request("DELETE", `/v1/orders/${direction}/${orderId}/lineitems/${lineItemId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.lineItems.delete", resourceType: "LineItem", resourceId: lineItemId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, orderId, lineItemId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.lineItems.delete", resourceType: "LineItem", resourceId: lineItemId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
