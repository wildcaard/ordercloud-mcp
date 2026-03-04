/**
 * Supplier tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all supplier-related tools.
 */
export function registerSupplierTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.suppliers.search",
    {
      description: "Search and list OrderCloud suppliers with filtering, pagination, and sorting",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search across supplier fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters, e.g. {\"Active\": \"true\"}"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending, e.g. \"!DateCreated\""),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList>("GET", "/v1/suppliers", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.get",
    {
      description: "Get a single OrderCloud supplier by ID",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID"),
      }),
    },
    async ({ supplierId }) => {
      try {
        const data = await client.request("GET", `/v1/suppliers/${supplierId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.create",
    {
      description: "Create a new OrderCloud supplier",
      inputSchema: z.object({
        supplier: z.object({
          ID: z.string().describe("Unique supplier ID"),
          Name: z.string().describe("Supplier name"),
          Active: z.boolean().optional().default(true),
          Description: z.string().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Supplier object to create"),
      }),
    },
    async ({ supplier }) => {
      const params = { supplier };
      try {
        const data = await client.request("POST", "/v1/suppliers", undefined, supplier);
        recordAudit({ operation: "create", toolName: "ordercloud.suppliers.create", resourceType: "Supplier", resourceId: supplier.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.suppliers.create", resourceType: "Supplier", resourceId: supplier.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.patch",
    {
      description: "Partially update an OrderCloud supplier (JSON Merge Patch semantics)",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"Active\": false}"),
      }),
    },
    async ({ supplierId, patch }) => {
      const params = { supplierId, patch };
      try {
        const data = await client.request("PATCH", `/v1/suppliers/${supplierId}`, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.suppliers.patch", resourceType: "Supplier", resourceId: supplierId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.suppliers.patch", resourceType: "Supplier", resourceId: supplierId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.suppliers.delete",
    {
      description: "Delete an OrderCloud supplier by ID",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID to delete"),
      }),
    },
    async ({ supplierId }) => {
      const params = { supplierId };
      try {
        await client.request("DELETE", `/v1/suppliers/${supplierId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.suppliers.delete", resourceType: "Supplier", resourceId: supplierId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, supplierId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.suppliers.delete", resourceType: "Supplier", resourceId: supplierId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
