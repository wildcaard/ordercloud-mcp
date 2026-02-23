/**
 * Payment tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Payment entity.
 */
interface Payment {
  ID: string;
  OrderID: string;
  Type?: "CreditCard" | "PurchaseOrder" | "Check" | "WireTransfer" | "COD" | "GiftCard";
  Status?: "Pending" | "Authorized" | "Captured" | "Voided" | "Declined";
  Amount?: number;
  Accepted?: boolean;
  xp?: Record<string, unknown>;
}

/**
 * Payment Transaction entity.
 */
interface PaymentTransaction {
  ID: string;
  PaymentID: string;
  Type?: "Authorization" | "Capture" | "Refund" | "Void";
  Amount?: number;
  ResultCode?: string;
  ResultMessage?: string;
  DateExecuted?: string;
  xp?: Record<string, unknown>;
}

/**
 * Register all payment-related tools.
 */
export function registerPaymentTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.payments.listForOrder",
    {
      description: "List all payments for a specific order",
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
        
        const data = await client.request<OcList<Payment>>("GET", `/v1/orders/${direction}/${orderId}/payments`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.get",
    {
      description: "Get a single OrderCloud payment by ID for an order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        paymentId: z.string().describe("The payment ID"),
      }),
    },
    async ({ orderId, direction, paymentId }) => {
      try {
        const data = await client.request<Payment>("GET", `/v1/orders/${direction}/${orderId}/payments/${paymentId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.create",
    {
      description: "Create a new payment for an order",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        payment: z.object({
          ID: z.string().describe("Unique payment ID"),
          Type: z.enum(["CreditCard", "PurchaseOrder", "Check", "WireTransfer", "COD", "GiftCard"]).optional().describe("Payment type"),
          Amount: z.number().optional().describe("Payment amount"),
          Accepted: z.boolean().optional().describe("Whether payment was accepted"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Payment object to create"),
      }),
    },
    async ({ orderId, direction, payment }) => {
      try {
        const data = await client.request<Payment>("POST", `/v1/orders/${direction}/${orderId}/payments`, undefined, payment);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.patch",
    {
      description: "Update an OrderCloud payment (partial update)",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        paymentId: z.string().describe("The payment ID to update"),
        payment: z.object({
          Type: z.enum(["CreditCard", "PurchaseOrder", "Check", "WireTransfer", "COD", "GiftCard"]).optional(),
          Status: z.enum(["Pending", "Authorized", "Captured", "Voided", "Declined"]).optional(),
          Amount: z.number().optional(),
          Accepted: z.boolean().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial payment object with fields to update"),
      }),
    },
    async ({ orderId, direction, paymentId, payment }) => {
      try {
        const data = await client.request<Payment>("PATCH", `/v1/orders/${direction}/${orderId}/payments/${paymentId}`, undefined, payment);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.payments.transactions.list",
    {
      description: "List all transactions for a specific payment",
      inputSchema: z.object({
        orderId: z.string().describe("The order ID"),
        direction: z.enum(["Incoming", "Outgoing"]).describe("Order direction"),
        paymentId: z.string().describe("The payment ID"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
      }),
    },
    async ({ orderId, direction, paymentId, page, pageSize }) => {
      try {
        const q: Record<string, string | number | undefined> = {};
        if (page) q["page"] = page;
        if (pageSize) q["pageSize"] = pageSize;
        
        const data = await client.request<OcList<PaymentTransaction>>("GET", `/v1/orders/${direction}/${orderId}/payments/${paymentId}/transactions`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );
}
