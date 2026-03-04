/**
 * Address tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Register all address-related tools.
 */
export function registerAddressTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.addresses.listForEntity",
    {
      description: "List addresses for a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["buyer", "supplier"]).describe("Type of entity to list addresses for"),
        entityId: z.string().describe("The buyer or supplier ID"),
        userId: z.string().optional().describe("For buyer addresses, optionally filter by user ID"),
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
        let path: string;
        
        if (params.entityType === "supplier") {
          path = `/v1/suppliers/${params.entityId}/addresses`;
        } else if (params.userId) {
          path = `/v1/buyers/${params.entityId}/users/${params.userId}/addresses`;
        } else {
          path = `/v1/buyers/${params.entityId}/addresses`;
        }
        
        const data = await client.request<OcList>("GET", path, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.get",
    {
      description: "Get a single address from a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["buyer", "supplier"]).describe("Type of entity the address belongs to"),
        entityId: z.string().describe("The buyer or supplier ID"),
        addressId: z.string().describe("The address ID"),
        userId: z.string().optional().describe("For buyer addresses, optionally specify user ID"),
      }),
    },
    async ({ entityType, entityId, addressId, userId }) => {
      try {
        let path: string;
        
        if (entityType === "supplier") {
          path = `/v1/suppliers/${entityId}/addresses/${addressId}`;
        } else if (userId) {
          path = `/v1/buyers/${entityId}/users/${userId}/addresses/${addressId}`;
        } else {
          path = `/v1/buyers/${entityId}/addresses/${addressId}`;
        }
        
        const data = await client.request("GET", path);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.create",
    {
      description: "Create a new address for a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["buyer", "supplier"]).describe("Type of entity to create address for"),
        entityId: z.string().describe("The buyer or supplier ID"),
        userId: z.string().optional().describe("For buyer addresses, optionally specify user ID"),
        address: z.object({
          ID: z.string().describe("Unique address ID"),
          AddressName: z.string().optional().describe("Address name/label"),
          CompanyName: z.string().optional().describe("Company name"),
          FirstName: z.string().optional().describe("First name"),
          LastName: z.string().optional().describe("Last name"),
          Street1: z.string().describe("Street address line 1"),
          Street2: z.string().optional().describe("Street address line 2"),
          City: z.string().optional().describe("City"),
          State: z.string().optional().describe("State/province"),
          Zip: z.string().optional().describe("Postal code"),
          Country: z.string().optional().describe("Country code"),
          Phone: z.string().optional().describe("Phone number"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Address object to create"),
      }),
    },
    async ({ entityType, entityId, userId, address }) => {
      const params = { entityType, entityId, userId, address };
      try {
        let path: string;
        
        if (entityType === "supplier") {
          path = `/v1/suppliers/${entityId}/addresses`;
        } else if (userId) {
          path = `/v1/buyers/${entityId}/users/${userId}/addresses`;
        } else {
          path = `/v1/buyers/${entityId}/addresses`;
        }
        
        const data = await client.request("POST", path, undefined, address);
        recordAudit({ operation: "create", toolName: "ordercloud.addresses.create", resourceType: "Address", resourceId: address.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.addresses.create", resourceType: "Address", resourceId: address.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.patch",
    {
      description: "Partially update an address on a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["buyer", "supplier"]).describe("Type of entity the address belongs to"),
        entityId: z.string().describe("The buyer or supplier ID"),
        addressId: z.string().describe("The address ID to update"),
        userId: z.string().optional().describe("For buyer addresses, optionally specify user ID"),
        patch: z.record(z.unknown()).describe("Fields to update, e.g. {\"Street1\": \"New Street\", \"City\": \"New City\"}"),
      }),
    },
    async ({ entityType, entityId, addressId, userId, patch }) => {
      const params = { entityType, entityId, addressId, userId, patch };
      try {
        let path: string;
        
        if (entityType === "supplier") {
          path = `/v1/suppliers/${entityId}/addresses/${addressId}`;
        } else if (userId) {
          path = `/v1/buyers/${entityId}/users/${userId}/addresses/${addressId}`;
        } else {
          path = `/v1/buyers/${entityId}/addresses/${addressId}`;
        }
        
        const data = await client.request("PATCH", path, undefined, patch);
        recordAudit({ operation: "update", toolName: "ordercloud.addresses.patch", resourceType: "Address", resourceId: addressId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.addresses.patch", resourceType: "Address", resourceId: addressId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.addresses.delete",
    {
      description: "Delete an address from a Buyer or Supplier",
      inputSchema: z.object({
        entityType: z.enum(["buyer", "supplier"]).describe("Type of entity the address belongs to"),
        entityId: z.string().describe("The buyer or supplier ID"),
        addressId: z.string().describe("The address ID to delete"),
        userId: z.string().optional().describe("For buyer addresses, optionally specify user ID"),
      }),
    },
    async ({ entityType, entityId, addressId, userId }) => {
      const params = { entityType, entityId, addressId, userId };
      try {
        let path: string;
        
        if (entityType === "supplier") {
          path = `/v1/suppliers/${entityId}/addresses/${addressId}`;
        } else if (userId) {
          path = `/v1/buyers/${entityId}/users/${userId}/addresses/${addressId}`;
        } else {
          path = `/v1/buyers/${entityId}/addresses/${addressId}`;
        }
        
        await client.request("DELETE", path);
        recordAudit({ operation: "delete", toolName: "ordercloud.addresses.delete", resourceType: "Address", resourceId: addressId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, entityType, entityId, addressId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.addresses.delete", resourceType: "Address", resourceId: addressId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
