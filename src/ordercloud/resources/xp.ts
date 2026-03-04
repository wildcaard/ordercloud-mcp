/**
 * Extended Properties (XP) tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, resolveResourcePath, validateXp, deepMerge } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all XP (extended properties) related tools.
 */
export function registerXpTools(server: McpServer, client: OrderCloudClient): void {
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
      const params = { resourceType, identifiers, xpPatch };
      const resourceId = identifiers.productId ?? identifiers.orderId ?? identifiers.userId ?? identifiers.buyerId ?? identifiers.categoryId ?? identifiers.catalogId;
      try {
        validateXp(xpPatch);
        
        const path = resolveResourcePath(resourceType, identifiers);
        const current = await client.request<{ xp?: Record<string, unknown> }>("GET", path);
        
        const mergedXp = deepMerge(current.xp || {}, xpPatch);
        const data = await client.request("PATCH", path, undefined, { xp: mergedXp });
        
        recordAudit({ operation: "update", toolName: "ordercloud.xp.patch", resourceType: "XP", resourceId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.xp.patch", resourceType: "XP", resourceId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
