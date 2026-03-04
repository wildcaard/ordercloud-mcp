/**
 * Shipment tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Shipment entity.
 */
interface Shipment {
  ID: string;
  OrderID: string;
  Shipper: string;
  TrackingNumber?: string;
  DateShipped?: string;
  DateDelivered?: string;
  Status?: string;
  xp?: Record<string, unknown>;
}

/**
 * Shipment Item entity.
 */
interface ShipmentItem {
  OrderID: string;
  LineItemID: string;
  QuantityShipped: number;
}

/**
 * Register all shipment-related tools.
 */
export function registerShipmentTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.shipments.search",
    {
      description: "Search and list OrderCloud shipments with filtering, pagination, and sorting",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search across shipment fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters, e.g. {\"OrderID\": \"ORD-123\"}"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<Shipment>>("GET", "/v1/shipments", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.get",
    {
      description: "Get a single OrderCloud shipment by ID",
      inputSchema: z.object({
        shipmentId: z.string().describe("The shipment ID"),
      }),
    },
    async ({ shipmentId }) => {
      try {
        const data = await client.request<Shipment>("GET", `/v1/shipments/${shipmentId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.create",
    {
      description: "Create a new OrderCloud shipment",
      inputSchema: z.object({
        shipment: z.object({
          ID: z.string().describe("Unique shipment ID"),
          OrderID: z.string().describe("The order ID this shipment is for"),
          Shipper: z.string().describe("Name of the shipping carrier"),
          TrackingNumber: z.string().optional().describe("Tracking number for the shipment"),
          DateShipped: z.string().optional().describe("Date shipped (ISO 8601)"),
          DateDelivered: z.string().optional().describe("Date delivered (ISO 8601)"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Shipment object to create"),
      }),
    },
    async ({ shipment }) => {
      const params = { shipment };
      try {
        const data = await client.request<Shipment>("POST", "/v1/shipments", undefined, shipment);
        recordAudit({ operation: "create", toolName: "ordercloud.shipments.create", resourceType: "Shipment", resourceId: shipment.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.shipments.create", resourceType: "Shipment", resourceId: shipment.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.patch",
    {
      description: "Update an OrderCloud shipment (partial update)",
      inputSchema: z.object({
        shipmentId: z.string().describe("The shipment ID to update"),
        shipment: z.object({
          Shipper: z.string().optional(),
          TrackingNumber: z.string().optional(),
          DateShipped: z.string().optional(),
          DateDelivered: z.string().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial shipment object with fields to update"),
      }),
    },
    async ({ shipmentId, shipment }) => {
      const params = { shipmentId, shipment };
      try {
        const data = await client.request<Shipment>("PATCH", `/v1/shipments/${shipmentId}`, undefined, shipment);
        recordAudit({ operation: "update", toolName: "ordercloud.shipments.patch", resourceType: "Shipment", resourceId: shipmentId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.shipments.patch", resourceType: "Shipment", resourceId: shipmentId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
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
        orderId: z.string().describe("The order ID"),
        lineItemId: z.string().describe("The line item ID to add to the shipment"),
        quantityShipped: z.number().int().min(1).describe("Quantity shipped"),
      }),
    },
    async ({ shipmentId, orderId, lineItemId, quantityShipped }) => {
      const params = { shipmentId, orderId, lineItemId, quantityShipped };
      try {
        const shipmentItem: ShipmentItem = {
          OrderID: orderId,
          LineItemID: lineItemId,
          QuantityShipped: quantityShipped,
        };
        const data = await client.request("POST", `/v1/shipments/${shipmentId}/items`, undefined, shipmentItem);
        recordAudit({ operation: "update", toolName: "ordercloud.shipments.addLineItem", resourceType: "Shipment", resourceId: shipmentId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.shipments.addLineItem", resourceType: "Shipment", resourceId: shipmentId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.shipments.listForOrder",
    {
      description: "List all shipments for a specific order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
      }),
    },
    async ({ orderId, direction, page, pageSize }) => {
      try {
        const q: Record<string, string | number | undefined> = {};
        if (page) q["page"] = page;
        if (pageSize) q["pageSize"] = pageSize;
        
        const data = await client.request<OcList<Shipment>>("GET", `/v1/orders/${direction}/${orderId}/shipments`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );
}
