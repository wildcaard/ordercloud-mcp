/**
 * Spec and Spec Option tools for OrderCloud MCP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OrderCloudClient } from "../client.js";
import { ok, err, buildListQuery, normalizePagination, OcList } from "../helpers/index.js";

/**
 * Spec entity.
 */
interface Spec {
  ID: string;
  Name: string;
  Description?: string;
  Active?: boolean;
  Required?: boolean;
  AllowOrdering?: boolean;
  DefaultValue?: string;
  xp?: Record<string, unknown>;
}

/**
 * Spec Option entity.
 */
interface SpecOption {
  ID: string;
  SpecID: string;
  Value: string;
  Description?: string;
  PriceMarkupType?: "None" | "Percentage" | "FixedAmount";
  PriceMarkup?: number;
  xp?: Record<string, unknown>;
}

/**
 * Register all spec-related tools.
 */
export function registerSpecTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.specs.list",
    {
      description: "List OrderCloud specs with filtering, pagination, and sorting",
      inputSchema: z.object({
        search: z.string().optional().describe("Keyword search across spec fields"),
        filters: z.record(z.string()).optional().describe("Field-level filters, e.g. {\"Active\": \"true\"}"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field, prefix with ! for descending"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<Spec>>("GET", "/v1/specs", q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.get",
    {
      description: "Get a single OrderCloud spec by ID",
      inputSchema: z.object({
        specId: z.string().describe("The spec ID"),
      }),
    },
    async ({ specId }) => {
      try {
        const data = await client.request<Spec>("GET", `/v1/specs/${specId}`);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.create",
    {
      description: "Create a new OrderCloud spec",
      inputSchema: z.object({
        spec: z.object({
          ID: z.string().describe("Unique spec ID"),
          Name: z.string().describe("Spec name"),
          Description: z.string().optional(),
          Active: z.boolean().optional().default(true),
          Required: z.boolean().optional().default(false),
          AllowOrdering: z.boolean().optional().default(true),
          DefaultValue: z.string().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Spec object to create"),
      }),
    },
    async ({ spec }) => {
      try {
        const data = await client.request<Spec>("POST", "/v1/specs", undefined, spec);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.patch",
    {
      description: "Update an OrderCloud spec (partial update)",
      inputSchema: z.object({
        specId: z.string().describe("The spec ID to update"),
        spec: z.object({
          Name: z.string().optional(),
          Description: z.string().optional(),
          Active: z.boolean().optional(),
          Required: z.boolean().optional(),
          AllowOrdering: z.boolean().optional(),
          DefaultValue: z.string().optional(),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Partial spec object with fields to update"),
      }),
    },
    async ({ specId, spec }) => {
      try {
        const data = await client.request<Spec>("PATCH", `/v1/specs/${specId}`, undefined, spec);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.delete",
    {
      description: "Delete an OrderCloud spec",
      inputSchema: z.object({
        specId: z.string().describe("The spec ID to delete"),
      }),
    },
    async ({ specId }) => {
      try {
        await client.request("DELETE", `/v1/specs/${specId}`);
        return ok({ deleted: true, id: specId });
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.options.list",
    {
      description: "List options for a specific spec",
      inputSchema: z.object({
        specId: z.string().describe("The spec ID"),
        search: z.string().optional().describe("Keyword search"),
        page: z.number().int().min(1).optional().describe("Page number (1-based)"),
        pageSize: z.number().int().min(1).max(100).optional().describe("Items per page (max 100)"),
        sortBy: z.string().optional().describe("Sort field"),
      }),
    },
    async (params) => {
      try {
        const q = buildListQuery(params);
        const data = await client.request<OcList<SpecOption>>("GET", `/v1/specs/${params.specId}/options`, q);
        return ok(normalizePagination(data));
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.specs.options.add",
    {
      description: "Add an option to a spec",
      inputSchema: z.object({
        specId: z.string().describe("The spec ID"),
        option: z.object({
          ID: z.string().describe("Unique option ID"),
          Value: z.string().describe("Option value display text"),
          Description: z.string().optional(),
          PriceMarkupType: z.enum(["None", "Percentage", "FixedAmount"]).optional().default("None"),
          PriceMarkup: z.number().optional().describe("Price markup amount (if applicable)"),
          xp: z.record(z.unknown()).optional().describe("Extended properties"),
        }).describe("Spec option to create"),
      }),
    },
    async ({ specId, option }) => {
      try {
        const data = await client.request<SpecOption>("POST", `/v1/specs/${specId}/options`, undefined, option);
        return ok(data);
      } catch (e) {
        return err(e);
      }
    }
  );

  server.registerTool(
    "ordercloud.products.generateVariants",
    {
      description: "Generate variants for a product based on its specs",
      inputSchema: z.object({
        productId: z.string().describe("The product ID"),
        priceScheduleId: z.string().optional().describe("Optional price schedule ID to assign to variants"),
      }),
    },
    async ({ productId, priceScheduleId }) => {
      try {
        // First get the product to see what specs are assigned
        const product = await client.request("GET", `/v1/products/${productId}`);
        
        // Get specs for this product
        const specsData = await client.request<OcList<Spec>>("GET", `/v1/products/${productId}/specs`);
        
        if (!specsData.Items || specsData.Items.length === 0) {
          return err(new Error("Product has no specs assigned. Assign specs before generating variants."));
        }

        // Get options for each spec
        const specOptions: SpecOption[][] = [];
        for (const spec of specsData.Items) {
          const optionsData = await client.request<OcList<SpecOption>>("GET", `/v1/specs/${spec.ID}/options`);
          if (optionsData.Items && optionsData.Items.length > 0) {
            specOptions.push(optionsData.Items);
          }
        }

        if (specOptions.length === 0) {
          return err(new Error("No spec options found. Add options to specs before generating variants."));
        }

        // Generate all combinations using cartesian product
        const generateCombinations = <T>(arrays: T[][]): T[][] => {
          if (arrays.length === 0) return [[]];
          return arrays.reduce<T[][]>((acc, curr) => {
            const result: T[][] = [];
            acc.forEach((a) => curr.forEach((b) => result.push([...a, b])));
            return result;
          }, [[]]);
        };

        const combinations = generateCombinations(specOptions);
        const variants: { id: string; name: string; options: string[]; error?: string }[] = [];

        // Create variants
        for (const combo of combinations) {
          const variantId = `${productId}-${combo.map((o) => o.ID).join("-")}`;
          const variantName = combo.map((o) => o.Value).join(" / ");
          
          const variantData: Record<string, unknown> = {
            ID: variantId,
            Name: variantName,
            Active: true,
          };

          if (priceScheduleId) {
            (variantData as Record<string, unknown>).DefaultPriceScheduleID = priceScheduleId;
          }

          try {
            await client.request("POST", `/v1/products/${productId}/variants`, undefined, variantData);
            variants.push({ id: variantId, name: variantName, options: combo.map((o) => o.Value) });
          } catch (e) {
            // Variant might already exist, continue
            variants.push({ id: variantId, name: variantName, options: combo.map((o) => o.Value), error: "may already exist" });
          }
        }

        return ok({
          productId,
          variantsGenerated: variants.length,
          variants,
        });
      } catch (e) {
        return err(e);
      }
    }
  );
}
