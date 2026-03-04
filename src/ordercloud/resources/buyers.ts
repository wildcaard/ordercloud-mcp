/**
 * Buyer and User tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all buyer and user-related tools.
 */
export function registerBuyerTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.buyers.search",
    {
      description: "Search OrderCloud buyer organizations",
      inputSchema: z.object({
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
        const data = await client.request<OcList>("GET", "/v1/buyers", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.buyers.get",
    {
      description: "Get a single OrderCloud buyer by ID",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
      }),
    },
    async ({ buyerId }) => {
      try {
        const data = await client.request("GET", `/v1/buyers/${buyerId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.buyers.create",
    {
      description: "Create a new OrderCloud buyer",
      inputSchema: z.object({
        buyer: z.object({
          ID: z.string().describe("Unique buyer ID"),
          Name: z.string().describe("Buyer name"),
          Active: z.boolean().optional().default(true),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Buyer object to create"),
      }),
    },
    async ({ buyer }) => {
      const params = { buyer };
      try {
        const data = await client.request("POST", "/v1/buyers", undefined, buyer);
        recordAudit({ operation: "create", toolName: "ordercloud.buyers.create", resourceType: "Buyer", resourceId: buyer.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.buyers.create", resourceType: "Buyer", resourceId: buyer.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.buyers.patch",
    {
      description: "Partially update an OrderCloud buyer",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Name\": \"New Name\", \"Active\": false}"),
      }),
    },
    async ({ buyerId, patch }) => {
      const params = { buyerId, patch };
      try {
        const data = await client.request("PATCH", `/v1/buyers/${buyerId}`, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.buyers.patch", resourceType: "Buyer", resourceId: buyerId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.buyers.patch", resourceType: "Buyer", resourceId: buyerId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.buyers.delete",
    {
      description: "Delete an OrderCloud buyer by ID",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID to delete"),
      }),
    },
    async ({ buyerId }) => {
      const params = { buyerId };
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.buyers.delete", resourceType: "Buyer", resourceId: buyerId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, buyerId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.buyers.delete", resourceType: "Buyer", resourceId: buyerId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.search",
    {
      description: "Search users within an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
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
        const data = await client.request<OcList>("GET", `/v1/buyers/${params.buyerId}/users`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.get",
    {
      description: "Get a single user from an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        userId: z.string().describe("The user ID"),
      }),
    },
    async ({ buyerId, userId }) => {
      try {
        const data = await client.request("GET", `/v1/buyers/${buyerId}/users/${userId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.create",
    {
      description: "Create a new user in an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        user: z.object({
          ID: z.string().describe("Unique user ID"),
          Username: z.string().describe("Username"),
          FirstName: z.string().optional(),
          LastName: z.string().optional(),
          Email: z.string().describe("Email address"),
          Phone: z.string().optional(),
          Active: z.boolean().optional().default(true),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("User object to create"),
      }),
    },
    async ({ buyerId, user }) => {
      const params = { buyerId, user };
      try {
        const data = await client.request("POST", `/v1/buyers/${buyerId}/users`, undefined, user);
        recordAudit({ operation: "create", toolName: "ordercloud.users.create", resourceType: "User", resourceId: user.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.users.create", resourceType: "User", resourceId: user.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.patch",
    {
      description: "Partially update a user in an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        userId: z.string().describe("The user ID to update"),
        patch: z.record(z.unknown()).describe("Fields to update"),
      }),
    },
    async ({ buyerId, userId, patch }) => {
      const params = { buyerId, userId, patch };
      try {
        const data = await client.request("PATCH", `/v1/buyers/${buyerId}/users/${userId}`, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.users.patch", resourceType: "User", resourceId: userId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.users.patch", resourceType: "User", resourceId: userId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.users.delete",
    {
      description: "Delete a user from an OrderCloud buyer organization",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer organization ID"),
        userId: z.string().describe("The user ID to delete"),
      }),
    },
    async ({ buyerId, userId }) => {
      const params = { buyerId, userId };
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}/users/${userId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.users.delete", resourceType: "User", resourceId: userId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, buyerId, userId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.users.delete", resourceType: "User", resourceId: userId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
