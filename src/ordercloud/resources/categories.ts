/**
 * Category tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Register all category-related tools.
 */
export function registerCategoryTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.categories.search",
    {
      description: "Search categories within an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
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
        const data = await client.request<OcList>("GET", `/v1/catalogs/${params.catalogId}/categories`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.get",
    {
      description: "Get a single category from an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        categoryId: z.string().describe("The category ID"),
      }),
    },
    async ({ catalogId, categoryId }) => {
      try {
        const data = await client.request("GET", `/v1/catalogs/${catalogId}/categories/${categoryId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.create",
    {
      description: "Create a new category in an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        category: z.object({
          ID: z.string().describe("Unique category ID"),
          Name: z.string().describe("Category name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          ParentID: z.string().optional().describe("Parent category ID for nesting"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Category object to create"),
      }),
    },
    async ({ catalogId, category }) => {
      try {
        const data = await client.request("POST", `/v1/catalogs/${catalogId}/categories`, undefined, category);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.patch",
    {
      description: "Partially update a category in an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        categoryId: z.string().describe("The category ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"Active\": false}"),
      }),
    },
    async ({ catalogId, categoryId, patch }) => {
      try {
        const data = await client.request("PATCH", `/v1/catalogs/${catalogId}/categories/${categoryId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.categories.delete",
    {
      description: "Delete a category from an OrderCloud catalog",
      inputSchema: z.object({
        catalogId: z.string().describe("The catalog ID"),
        categoryId: z.string().describe("The category ID to delete"),
      }),
    },
    async ({ catalogId, categoryId }) => {
      try {
        await client.request("DELETE", `/v1/catalogs/${catalogId}/categories/${categoryId}`);
        return ok({ deleted: true, catalogId, categoryId });
      } catch (e) {
        return err(e);
      }
    }
  );
}
