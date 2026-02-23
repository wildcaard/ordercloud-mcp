/**
 * Price Schedule tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Register all price schedule-related tools.
 */
export function registerPriceScheduleTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.priceSchedules.list",
    {
      description: "List price schedules with optional filtering",
      inputSchema: z.object({
        productId: z.string().optional().describe("Filter by product ID"),
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
      description: "Get a single price schedule by ID",
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
          ProductID: z.string().optional().describe("Associated product ID"),
          Currency: z.string().optional().describe("Currency code (e.g., USD)"),
          MinQuantity: z.number().int().optional().describe("Minimum quantity"),
          MaxQuantity: z.number().int().optional().describe("Maximum quantity"),
          PriceBreaks: z.array(z.object({
            Quantity: z.number().int().describe("Quantity threshold"),
            Price: z.number().describe("Price at this quantity"),
            SalePrice: z.number().optional().describe("Sale price"),
          })).optional().describe("Price breaks array"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
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
        priceScheduleId: z.string().describe("The price schedule ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\"}"),
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
      description: "Add a price break to an existing price schedule",
      inputSchema: z.object({
        priceScheduleId: z.string().describe("The price schedule ID"),
        priceBreak: z.object({
          Quantity: z.number().int().describe("Quantity threshold"),
          Price: z.number().describe("Price at this quantity"),
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
}
