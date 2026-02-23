/**
 * Supplier tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Register all supplier-related tools.
 */
export function registerSupplierTools(server: McpServer, client: OrderCloudClient): void {
  // ── Supplier Search ──
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

  // ── Supplier Get ──
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

  // ── Supplier Create ──
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
      try {
        const data = await client.request("POST", "/v1/suppliers", undefined, supplier);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── Supplier Patch ──
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
      try {
        const data = await client.request("PATCH", `/v1/suppliers/${supplierId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── Supplier Delete ──
  server.registerTool(
    "ordercloud.suppliers.delete",
    {
      description: "Delete an OrderCloud supplier by ID",
      inputSchema: z.object({
        supplierId: z.string().describe("The supplier ID to delete"),
      }),
    },
    async ({ supplierId }) => {
      try {
        await client.request("DELETE", `/v1/suppliers/${supplierId}`);
        return ok({ deleted: true, supplierId });
      } catch (e) {
        return err(e);
      }
    }
  );
}
