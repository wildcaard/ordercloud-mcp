#!/usr/bin/env node
/**
 * OrderCloud MCP Server
 *
 * Exposes Sitecore OrderCloud admin operations as MCP tools
 * for use with Claude Code and other MCP-compatible clients.
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from project root (works when run as "node dist/index.js" from project or from dist)
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
config({ path: join(projectRoot, ".env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OrderCloudClient } from "./ordercloud/client.js";
import { registerTools } from "./ordercloud/tools.js";
import { registerMcpResources } from "./ordercloud/resources-mcp.js";
import { registerMcpPrompts } from "./ordercloud/prompts-mcp.js";

async function main() {
  const client = new OrderCloudClient();

  const server = new McpServer({
    name: "ordercloud-mcp",
    version: "1.0.0",
  });

  registerTools(server, client);
  registerMcpResources(server, client);
  registerMcpPrompts(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[ordercloud-mcp] Server running (stdio) | base=${client.baseUrl} auth=${client.currentAuthMode}\n`
  );
}

main().catch((e) => {
  process.stderr.write(`[ordercloud-mcp] Fatal: ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
