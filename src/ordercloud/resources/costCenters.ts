/**
 * Cost Center and Spending Account tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";
import { recordAudit, sanitizeForAudit } from "../helpers/audit.js";

/**
 * Cost Center entity.
 */
interface CostCenter {
  ID: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  xp?: Record<string, unknown>;
}

/**
 * Spending Account entity.
 */
interface SpendingAccount {
  ID: string;
  Name: string;
  Description?: string;
  Status?: "Active" | "Inactive";
  Balance?: number;
  Limit?: number;
  StartDate?: string;
  EndDate?: string;
  AllowExceed?: boolean;
  xp?: Record<string, unknown>;
}

/**
 * Register all cost center and spending account tools.
 */
export function registerCostCenterTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.costCenters.list",
    {
      description: "List OrderCloud cost centers with filtering, pagination, and sorting",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        search: z.string().optional().describe("Keyword search across cost center fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<CostCenter>>("GET", `/v1/buyers/${params.buyerId}/costcenters`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.costCenters.get",
    {
      description: "Get a single OrderCloud cost center by ID",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        costCenterId: z.string().describe("The cost center ID"),
      }),
    },
    async ({ buyerId, costCenterId }) => {
      try {
        const data = await client.request<CostCenter>("GET", `/v1/buyers/${buyerId}/costcenters/${costCenterId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.costCenters.create",
    {
      description: "Create a new cost center for a buyer",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        costCenter: z.object({
          ID: z.string().describe("Unique cost center ID"),
          Name: z.string().describe("Cost center name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Cost center object to create"),
      }),
    },
    async ({ buyerId, costCenter }) => {
      const params = { buyerId, costCenter };
      try {
        const data = await client.request<CostCenter>("POST", `/v1/buyers/${buyerId}/costcenters`, undefined, costCenter);
        recordAudit({ operation: "create", toolName: "ordercloud.costCenters.create", resourceType: "CostCenter", resourceId: costCenter.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.costCenters.create", resourceType: "CostCenter", resourceId: costCenter.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.costCenters.patch",
    {
      description: "Update a cost center (partial update)",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        costCenterId: z.string().describe("The cost center ID to update"),
        costCenter: z.object({
          Name: z.string().optional(),
          Description: z.string().optional(),
          Active: z.boolean().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial cost center object with fields to update"),
      }),
    },
    async ({ buyerId, costCenterId, costCenter }) => {
      const params = { buyerId, costCenterId, costCenter };
      try {
        const data = await client.request<CostCenter>("PATCH", `/v1/buyers/${buyerId}/costcenters/${costCenterId}`, undefined, costCenter);
        recordAudit({ operation: "update", toolName: "ordercloud.costCenters.patch", resourceType: "CostCenter", resourceId: costCenterId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.costCenters.patch", resourceType: "CostCenter", resourceId: costCenterId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.costCenters.delete",
    {
      description: "Delete a cost center",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        costCenterId: z.string().describe("The cost center ID to delete"),
      }),
    },
    async ({ buyerId, costCenterId }) => {
      const params = { buyerId, costCenterId };
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}/costcenters/${costCenterId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.costCenters.delete", resourceType: "CostCenter", resourceId: costCenterId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, id: costCenterId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.costCenters.delete", resourceType: "CostCenter", resourceId: costCenterId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.spendingAccounts.list",
    {
      description: "List OrderCloud spending accounts with filtering, pagination, and sorting",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        search: z.string().optional().describe("Keyword search across spending account fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<SpendingAccount>>("GET", `/v1/buyers/${params.buyerId}/spendingaccounts`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.spendingAccounts.get",
    {
      description: "Get a single OrderCloud spending account by ID",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        spendingAccountId: z.string().describe("The spending account ID"),
      }),
    },
    async ({ buyerId, spendingAccountId }) => {
      try {
        const data = await client.request<SpendingAccount>("GET", `/v1/buyers/${buyerId}/spendingaccounts/${spendingAccountId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.spendingAccounts.create",
    {
      description: "Create a new spending account for a buyer",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        spendingAccount: z.object({
          ID: z.string().describe("Unique spending account ID"),
          Name: z.string().describe("Spending account name"),
          Description: z.string().optional(),
          Status: z.enum(["Active", "Inactive"]).optional().default("Active"),
          Balance: z.number().optional().describe("Current balance"),
          Limit: z.number().optional().describe("Spending limit"),
          StartDate: z.string().optional().describe("Start date (ISO 8601)"),
          EndDate: z.string().optional().describe("End date (ISO 8601)"),
          AllowExceed: z.boolean().optional().describe("Allow spending to exceed limit"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Spending account object to create"),
      }),
    },
    async ({ buyerId, spendingAccount }) => {
      const params = { buyerId, spendingAccount };
      try {
        const data = await client.request<SpendingAccount>("POST", `/v1/buyers/${buyerId}/spendingaccounts`, undefined, spendingAccount);
        recordAudit({ operation: "create", toolName: "ordercloud.spendingAccounts.create", resourceType: "SpendingAccount", resourceId: spendingAccount.ID, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "create", toolName: "ordercloud.spendingAccounts.create", resourceType: "SpendingAccount", resourceId: spendingAccount.ID, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.spendingAccounts.patch",
    {
      description: "Update a spending account (partial update)",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        spendingAccountId: z.string().describe("The spending account ID to update"),
        spendingAccount: z.object({
          Name: z.string().optional(),
          Description: z.string().optional(),
          Status: z.enum(["Active", "Inactive"]).optional(),
          Balance: z.number().optional(),
          Limit: z.number().optional(),
          StartDate: z.string().optional(),
          EndDate: z.string().optional(),
          AllowExceed: z.boolean().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial spending account object with fields to update"),
      }),
    },
    async ({ buyerId, spendingAccountId, spendingAccount }) => {
      const params = { buyerId, spendingAccountId, spendingAccount };
      try {
        const data = await client.request<SpendingAccount>("PATCH", `/v1/buyers/${buyerId}/spendingaccounts/${spendingAccountId}`, undefined, spendingAccount);
        recordAudit({ operation: "update", toolName: "ordercloud.spendingAccounts.patch", resourceType: "SpendingAccount", resourceId: spendingAccountId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok(data);
      } catch (e) {
        recordAudit({ operation: "update", toolName: "ordercloud.spendingAccounts.patch", resourceType: "SpendingAccount", resourceId: spendingAccountId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.spendingAccounts.delete",
    {
      description: "Delete a spending account",
      inputSchema: z.object({
        buyerId: z.string().describe("The buyer ID"),
        spendingAccountId: z.string().describe("The spending account ID to delete"),
      }),
    },
    async ({ buyerId, spendingAccountId }) => {
      const params = { buyerId, spendingAccountId };
      try {
        await client.request("DELETE", `/v1/buyers/${buyerId}/spendingaccounts/${spendingAccountId}`);
        recordAudit({ operation: "delete", toolName: "ordercloud.spendingAccounts.delete", resourceType: "SpendingAccount", resourceId: spendingAccountId, paramsSanitized: sanitizeForAudit(params), success: true });
        return ok({ deleted: true, id: spendingAccountId });
      } catch (e) {
        recordAudit({ operation: "delete", toolName: "ordercloud.spendingAccounts.delete", resourceType: "SpendingAccount", resourceId: spendingAccountId, paramsSanitized: sanitizeForAudit(params), success: false, errorMessage: e instanceof Error ? e.message : String(e) });
        return err(e);
      }
    }
  );
}
