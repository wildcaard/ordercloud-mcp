/**
 * Phase 5.1: Bulk product operations (client-side batching).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

const DEFAULT_BATCH_SIZE = 20;

interface BulkResult<T> {
  total: number;
  succeeded: number;
  failed: number;
  results: T[];
  errors: { id: string; message: string }[];
}

export function registerBulkTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.bulk.products.create",
    {
      description: "Create multiple products in batch (client-side batching). Returns success/failure per item.",
      inputSchema: z.object({
        products: z
          .array(
            z.object({
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
              xp: z.record(z.unknown()).optional(),
            })
          )
          .min(1)
          .max(100)
          .describe("Products to create"),
        batchSize: z.number().int().min(1).max(50).optional().default(DEFAULT_BATCH_SIZE).describe("Concurrent batch size"),
      }),
    },
    async ({ products, batchSize }) => {
      const result: BulkResult<unknown> = { total: products.length, succeeded: 0, failed: 0, results: [], errors: [] };
      try {
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (product) => {
              try {
                const data = await client.request("POST", "/v1/products", undefined, product);
                result.succeeded++;
                result.results.push(data);
                recordAudit({
                  operation: "create",
                  toolName: "ordercloud.bulk.products.create",
                  resourceType: "Product",
                  resourceId: product.ID,
                  paramsSanitized: sanitizeForAudit({ product }),
                  success: true,
                });
              } catch (e) {
                result.failed++;
                result.errors.push({ id: product.ID, message: e instanceof Error ? e.message : String(e) });
                recordAudit({
                  operation: "create",
                  toolName: "ordercloud.bulk.products.create",
                  resourceType: "Product",
                  resourceId: product.ID,
                  paramsSanitized: sanitizeForAudit({ product }),
                  success: false,
                  errorMessage: e instanceof Error ? e.message : String(e),
                });
              }
            })
          );
        }
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.bulk.products.patch",
    {
      description: "Patch multiple products in batch. Each item: productId + patch object.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              productId: z.string().describe("Product ID to update"),
              patch: z.record(z.unknown()).describe("Fields to update"),
            })
          )
          .min(1)
          .max(100)
          .describe("Product IDs and patches"),
        batchSize: z.number().int().min(1).max(50).optional().default(DEFAULT_BATCH_SIZE).describe("Concurrent batch size"),
      }),
    },
    async ({ items, batchSize }) => {
      const result: BulkResult<unknown> = { total: items.length, succeeded: 0, failed: 0, results: [], errors: [] };
      try {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async ({ productId, patch }) => {
              try {
                const data = await client.request("PATCH", `/v1/products/${productId}`, undefined, patch);
                result.succeeded++;
                result.results.push(data);
                recordAudit({
                  operation: "update",
                  toolName: "ordercloud.bulk.products.patch",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: sanitizeForAudit({ productId, patch }),
                  success: true,
                });
              } catch (e) {
                result.failed++;
                result.errors.push({ id: productId, message: e instanceof Error ? e.message : String(e) });
                recordAudit({
                  operation: "update",
                  toolName: "ordercloud.bulk.products.patch",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: sanitizeForAudit({ productId, patch }),
                  success: false,
                  errorMessage: e instanceof Error ? e.message : String(e),
                });
              }
            })
          );
        }
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.bulk.products.delete",
    {
      description: "Delete multiple products in batch. Returns success/failure per product ID.",
      inputSchema: z.object({
        productIds: z.array(z.string()).min(1).max(100).describe("Product IDs to delete"),
        batchSize: z.number().int().min(1).max(50).optional().default(DEFAULT_BATCH_SIZE).describe("Concurrent batch size"),
      }),
    },
    async ({ productIds, batchSize }) => {
      const result: BulkResult<null> = { total: productIds.length, succeeded: 0, failed: 0, results: [], errors: [] };
      try {
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (productId) => {
              try {
                await client.request("DELETE", `/v1/products/${productId}`);
                result.succeeded++;
                result.results.push(null);
                recordAudit({
                  operation: "delete",
                  toolName: "ordercloud.bulk.products.delete",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: { productId },
                  success: true,
                });
              } catch (e) {
                result.failed++;
                result.errors.push({ id: productId, message: e instanceof Error ? e.message : String(e) });
                recordAudit({
                  operation: "delete",
                  toolName: "ordercloud.bulk.products.delete",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: { productId },
                  success: false,
                  errorMessage: e instanceof Error ? e.message : String(e),
                });
              }
            })
          );
        }
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.bulk.products.activate",
    {
      description: "Activate or deactivate multiple products (set Active to true or false).",
      inputSchema: z.object({
        productIds: z.array(z.string()).min(1).max(100).describe("Product IDs to update"),
        active: z.boolean().default(true).describe("Set Active to this value"),
        batchSize: z.number().int().min(1).max(50).optional().default(DEFAULT_BATCH_SIZE).describe("Concurrent batch size"),
      }),
    },
    async ({ productIds, active, batchSize }) => {
      const result: BulkResult<unknown> = { total: productIds.length, succeeded: 0, failed: 0, results: [], errors: [] };
      try {
        const patch = { Active: active };
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (productId) => {
              try {
                const data = await client.request("PATCH", `/v1/products/${productId}`, undefined, patch);
                result.succeeded++;
                result.results.push(data);
                recordAudit({
                  operation: "update",
                  toolName: "ordercloud.bulk.products.activate",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: { productId, active },
                  success: true,
                });
              } catch (e) {
                result.failed++;
                result.errors.push({ id: productId, message: e instanceof Error ? e.message : String(e) });
                recordAudit({
                  operation: "update",
                  toolName: "ordercloud.bulk.products.activate",
                  resourceType: "Product",
                  resourceId: productId,
                  paramsSanitized: { productId, active },
                  success: false,
                  errorMessage: e instanceof Error ? e.message : String(e),
                });
              }
            })
          );
        }
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );
}
