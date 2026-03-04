/**
 * Product tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList, validateXp } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all product-related tools.
 */
export function registerProductTools(server: McpServer, client: OrderCloudClient): void {
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
      description: "Create a new OrderCloud product. Use dryRun: true to validate without persisting.",
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
        dryRun: z.boolean().optional().default(false).describe("If true, validate and return what would be created without persisting"),
      }),
    },
    async ({ product, dryRun }) => {
      const warnings: string[] = [];
      try {
        if (product.ID.length > 100) warnings.push("Product ID exceeds 100 characters (OrderCloud limit)");
        if (product.Name.length > 200) warnings.push("Product Name exceeds 200 characters (OrderCloud limit)");
        if (product.Description && product.Description.length > 2000) warnings.push("Description exceeds 2000 characters");
        if (product.xp) {
          try {
            validateXp(product.xp);
          } catch (xpErr) {
            return err(xpErr);
          }
        }
        if (dryRun) {
          return ok({
            wouldSucceed: true,
            validatedData: { product },
            warnings: warnings.length ? warnings : undefined,
          });
        }
        const data = await client.request("POST", "/v1/products", undefined, product);
        recordAudit({
          operation: "create",
          toolName: "ordercloud.products.create",
          resourceType: "Product",
          resourceId: product.ID,
          paramsSanitized: sanitizeForAudit({ product }),
          success: true,
        });
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.patch",
    {
      description: "Partially update an OrderCloud product (JSON Merge Patch semantics). Use dryRun: true to validate without persisting.",
      inputSchema: z.object({
        productId: z.string().describe("The product ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"xp\": {\"color\": \"red\"}}"),
        dryRun: z.boolean().optional().default(false).describe("If true, validate and return what would be updated without persisting"),
      }),
    },
    async ({ productId, patch, dryRun }) => {
      const warnings: string[] = [];
      try {
        if (Object.keys(patch).length === 0) return err(new Error("patch must contain at least one field"));
        const xp = patch.xp;
        if (xp !== undefined) {
          try {
            validateXp(xp);
          } catch (xpErr) {
            return err(xpErr);
          }
        }
        if (dryRun) {
          return ok({
            wouldSucceed: true,
            validatedData: { productId, patch },
            warnings: warnings.length ? warnings : undefined,
          });
        }
        const data = await client.request("PATCH", `/v1/products/${productId}`, undefined, patch);
        recordAudit({
          operation: "update",
          toolName: "ordercloud.products.patch",
          resourceType: "Product",
          resourceId: productId,
          paramsSanitized: sanitizeForAudit({ productId, patch }),
          success: true,
        });
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.delete",
    {
      description: "Delete an OrderCloud product by ID. Use dryRun: true to validate without deleting.",
      inputSchema: z.object({
        productId: z.string().describe("The product ID to delete"),
        dryRun: z.boolean().optional().default(false).describe("If true, return what would be deleted without persisting"),
      }),
    },
    async ({ productId, dryRun }) => {
      try {
        if (dryRun) {
          return ok({
            wouldSucceed: true,
            validatedData: { productId },
            warnings: undefined,
          });
        }
        await client.request("DELETE", `/v1/products/${productId}`);
        recordAudit({
          operation: "delete",
          toolName: "ordercloud.products.delete",
          resourceType: "Product",
          resourceId: productId,
          paramsSanitized: { productId },
          success: true,
        });
        return ok({ deleted: true, productId });
      } catch (e) {
        return err(e);
      }
    }
  );

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
      const params = { productId, price, currency, salePrice };
      try {
        const existing = await client.request<OcList<{ ID: string }>>("GET", "/v1/priceSchedules", { ProductID: productId });
        
        if (existing.Items && existing.Items.length > 0) {
          const priceScheduleId = existing.Items[0].ID;
          
          await client.request("DELETE", `/v1/priceSchedules/${priceScheduleId}/pricebreaks`);
          
          const newPriceBreak = { Quantity: 1, Price: price };
          if (salePrice !== undefined) {
            (newPriceBreak as Record<string, unknown>).SalePrice = salePrice;
          }
          
          const data = await client.request("POST", `/v1/priceSchedules/${priceScheduleId}/pricebreaks`, undefined, newPriceBreak);
          recordAudit({
            operation: "update",
            toolName: "ordercloud.products.setDefaultPrice",
            resourceType: "Product",
            resourceId: productId,
            paramsSanitized: sanitizeForAudit(params),
            success: true,
          });
          return ok({ updated: true, priceScheduleId: priceScheduleId, data });
        } else {
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
          
          await client.request("PATCH", `/v1/products/${productId}`, undefined, { 
            DefaultPriceScheduleID: newPriceSchedule.ID 
          });
          
          recordAudit({
            operation: "update",
            toolName: "ordercloud.products.setDefaultPrice",
            resourceType: "Product",
            resourceId: productId,
            paramsSanitized: sanitizeForAudit(params),
            success: true,
          });
          return ok({ created: true, priceScheduleId: newPriceSchedule.ID, data });
        }
      } catch (e) {
        recordAudit({
          operation: "update",
          toolName: "ordercloud.products.setDefaultPrice",
          resourceType: "Product",
          resourceId: productId,
          paramsSanitized: sanitizeForAudit(params),
          success: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        });
        return err(e);
      }
    }
  );
}
