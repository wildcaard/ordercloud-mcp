/**
 * Buyer and User tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Register all buyer and user-related tools.
 */
export function registerBuyerTools(server: McpServer, client: OrderCloudClient): void {
  // ── Buyer Search ──
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

  // ── Buyer Get ──
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

  // ── Buyer Create ──
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
      try {
        const data = await client.request("POST", "/v1/buyers", undefined, buyer);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── Buyer Patch ──
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
      try {
        const data = await client.request("PATCH", `/v1/buyers/${buyerId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── Buyer Delete ──
  server.registerTool(
    "ordercloud.buyers.delete",
    {
      description: "Delete an OrderCloud buyer by ID",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID to delete"),
      }),
    },
    async ({ buyerId }) => {
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}`);
        return ok({ deleted: true, buyerId });
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── User Search ──
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

  // ── User Get ──
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

  // ── User Create ──
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
      try {
        const data = await client.request("POST", `/v1/buyers/${buyerId}/users`, undefined, user);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── User Patch ──
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
      try {
        const data = await client.request("PATCH", `/v1/buyers/${buyerId}/users/${userId}`, undefined, patch);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  // ── User Delete ──
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
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}/users/${userId}`);
        return ok({ deleted: true, buyerId, userId });
      } catch (e) {
        return err(e);
      }
    }
  );
}
