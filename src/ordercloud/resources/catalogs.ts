/**
 * Catalog tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all catalog-related tools.
 */
export function registerCatalogTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.catalogs.list",
    {
      description: "List OrderCloud catalogs with pagination",
      inputSchema: z.object({
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
      }),
    },
    async (params) => {
      try {
        const q: Record<string, number | undefined> = { page: params.page, pageSize: params.pageSize };
        const data = await client.request<OcList>("GET", "/v1/catalogs", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.catalogs.get",
    {
      description: "Get a single OrderCloud catalog by ID",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
      }),
    },
    async ({ catalogId }) => {
      try {
        const data = await client.request("GET", `/v1/catalogs/${catalogId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.catalogs.create",
    {
      description: "Create a new OrderCloud catalog",
      inputSchema: z.object({
        catalog: z.object({
          ID: z.string().describe("Unique catalog ID"),
          Name: z.string().describe("Catalog name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Catalog object to create"),
      }),
    },
    async ({ catalog }) => {
      const params = { catalog };
      try {
        const data = await client.request("POST", "/v1/catalogs", undefined, catalog);
        recordAudit({ operation: "create", toolName: "ordercloud.catalogs.create", resourceType: "Catalog", resourceId: catalog.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.catalogs.create", resourceType: "Catalog", resourceId: catalog.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.catalogs.patch",
    {
      description: "Partially update an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"Active\": false}"),
      }),
    },
    async ({ catalogId, patch }) => {
      const params = { catalogId, patch };
      try {
        const data = await client.request("PATCH", `/v1/catalogs/${catalogId}`, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.catalogs.patch", resourceType: "Catalog", resourceId: catalogId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.catalogs.patch", resourceType: "Catalog", resourceId: catalogId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.catalogs.delete",
    {
      description: "Delete an OrderCloud catalog by ID",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID to delete"),
      }),
    },
    async ({ catalogId }) => {
      const params = { catalogId };
      try {
        await client.request("DELETE", `/v1/catalogs/${catalogId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.catalogs.delete", resourceType: "Catalog", resourceId: catalogId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, catalogId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.catalogs.delete", resourceType: "Catalog", resourceId: catalogId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
