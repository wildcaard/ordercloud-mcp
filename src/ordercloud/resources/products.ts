/**
 * Product tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Register all product-related tools.
 */
export function registerProductTools(server: McpServer, client: OrderCloudClient): void {
  // ── Product Search ──
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

  // ── Product Get ──
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

  // ── Product Create ──
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

  // ── Product Patch ──
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

  // ── Product Delete ──
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

  // ── Product Set Default Price ──
  server.registerTool(
    "ordercloud.products.setDefaultPrice",
    {
      description: "Set the default price for a product by creating or updating a price schedule",
      inputSchema: z.object({
        productId: z.string().describe("The product ID"),
        price: z.number().describe("Default price to set"),
        currency: z.string().optional().describe("Currency code (default: USD)"),
        salePrice: z.number().optional().describe("Optional sale price"),
      }),
    },
    async ({ productId, price, currency = "USD", salePrice }) => {
      try {
        // First, try to get existing price schedule for this product
        const existing = await client.request<OcList<{ ID: string }>>("GET", "/v1/priceSchedules", { ProductID: productId });
        
        if (existing.Items && existing.Items.length > 0) {
          // Update existing price schedule - delete existing price breaks first, then add new one
          const priceScheduleId = existing.Items[0].ID;
          
          // Delete all existing price breaks
          await client.request("DELETE", `/v1/priceSchedules/${priceScheduleId}/pricebreaks`);
          
          // Add new price break
          const newPriceBreak = { Quantity: 1, Price: price };
          if (salePrice !== undefined) {
            (newPriceBreak as Record<string, unknown>).SalePrice = salePrice;
          }
          
          const data = await client.request("POST", `/v1/priceSchedules/${priceScheduleId}/pricebreaks`, undefined, newPriceBreak);
          return ok({ updated: true, priceScheduleId: priceScheduleId, data });
        } else {
          // Create new price schedule
          const newPriceSchedule = {
            ID: `${productId}-default`,
            Name: `${productId} Default Price`,
            ProductID: productId,
            Currency: currency,
            PriceBreaks: [{
              Quantity: 1,
              Price: price,
              ...(salePrice !== undefined ? { SalePrice: salePrice } : {}),
            }],
          };
          
          const data = await client.request("POST", "/v1/priceSchedules", undefined, newPriceSchedule);
          
          // Update product to use this price schedule
          await client.request("PATCH", `/v1/products/${productId}`, undefined, { 
            DefaultPriceScheduleID: newPriceSchedule.ID 
          });
          
          return ok({ created: true, priceScheduleId: newPriceSchedule.ID, data });
        }
      } catch (e) {
        return err(e);
      }
    }
  );
}
