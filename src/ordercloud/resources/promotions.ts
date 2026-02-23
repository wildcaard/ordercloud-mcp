/**
 * Promotion tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Promotion entity.
 */
interface Promotion {
  ID: string;
  Code: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  StartDate?: string;
  EndDate?: string;
  LimitUses?: number;
  UseCount?: number;
  Value?: number;
  ValueType?: "Percentage" | "FixedAmount";
  MinOrderValue?: number;
  xp?: Record<string, unknown>;
}

/**
 * Register all promotion-related tools.
 */
export function registerPromotionTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.promotions.search",
    {
      description: "Search and list OrderCloud promotions with filtering, pagination, and sorting",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search across promotion fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters, e.g. {\"Active\": \"true\"}"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<Promotion>>("GET", "/v1/promotions", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.get",
    {
      description: "Get a single OrderCloud promotion by ID",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
      }),
    },
    async ({ promotionId }) => {
      try {
        const data = await client.request<Promotion>("GET", `/v1/promotions/${promotionId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.create",
    {
      description: "Create a new OrderCloud promotion",
      inputSchema: z.object({
        promotion: z.object({
          ID: z.string().describe("Unique promotion ID"),
          Code: z.string().describe("Promotion code customers enter at checkout"),
          Name: z.string().describe("Promotion name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(false),
          StartDate: z.string().optional().describe("Start date (ISO 8601)"),
          EndDate: z.string().optional().describe("End date (ISO 8601)"),
          LimitUses: z.number().int().optional().describe("Maximum number of uses allowed"),
          Value: z.number().optional().describe("Discount value (percentage or fixed amount)"),
          ValueType: z.enum(["Percentage", "FixedAmount"]).optional().describe("Type of discount value"),
          MinOrderValue: z.number().optional().describe("Minimum order value required to use promotion"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Promotion object to create"),
      }),
    },
    async ({ promotion }) => {
      try {
        const data = await client.request<Promotion>("POST", "/v1/promotions", undefined, promotion);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.patch",
    {
      description: "Update an OrderCloud promotion (partial update)",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID to update"),
        promotion: z.object({
          Code: z.string().optional(),
          Name: z.string().optional(),
          Description: z.string().optional(),
          Active: z.boolean().optional(),
          StartDate: z.string().optional(),
          EndDate: z.string().optional(),
          LimitUses: z.number().int().optional(),
          Value: z.number().optional(),
          ValueType: z.enum(["Percentage", "FixedAmount"]).optional(),
          MinOrderValue: z.number().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial promotion object with fields to update"),
      }),
    },
    async ({ promotionId, promotion }) => {
      try {
        const data = await client.request<Promotion>("PATCH", `/v1/promotions/${promotionId}`, undefined, promotion);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.delete",
    {
      description: "Delete an OrderCloud promotion",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID to delete"),
      }),
    },
    async ({ promotionId }) => {
      try {
        await client.request("DELETE", `/v1/promotions/${promotionId}`);
        return ok({ deleted: true, id: promotionId });
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.promotions.assign",
    {
      description: "Assign a promotion to a buyer",
      inputSchema: z.object({
        promotionId: z.string().describe("The promotion ID"),
        buyerId: z.string().describe("The buyer ID to assign the promotion to"),
      }),
    },
    async ({ promotionId, buyerId }) => {
      try {
        const data = await client.request("POST", `/v1/promotions/${promotionId}/assignments`, undefined, {
          BuyerID: buyerId,
        });
        return ok({ assigned: true, promotionId, buyerId });
      } catch (e) {
        return err(e);
      }
    }
  );
}
