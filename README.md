# ordercloud-mcp

MCP Server for Sitecore OrderCloud exposes admin operations as typed MCP tools for Claude Code and other MCP clients.

## Quick Start

```bash
npm install
npm run build
npm start
```

## Configuration

Set environment variables (or use `mcp.json` env block):

### Client Credentials (recommended)

| Variable | Default | Description |
|---|---|---|
| `ORDERCLOUD_BASE_URL` | `https://sandboxapi.ordercloud.io` | API base URL |
| `ORDERCLOUD_CLIENT_ID` | — | OAuth client ID |
| `ORDERCLOUD_CLIENT_SECRET` | — | OAuth client secret |
| `ORDERCLOUD_AUTH_URL` | `https://auth.ordercloud.io/oauth/token` | Token endpoint |
| `ORDERCLOUD_SCOPE` | `FullAccess` | Requested scopes |

### Pre-provided Token (alternative)

| Variable | Description |
|---|---|
| `ORDERCLOUD_ACCESS_TOKEN` | A valid bearer token (skips client credentials flow) |

## Claude Code Setup

Copy `mcp.json` to your project or global Claude Code config, updating the `cwd` and `env` values:

```json
{
  "mcpServers": {
    "ordercloud": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/ordercloud-mcp",
      "env": {
        "ORDERCLOUD_CLIENT_ID": "your-id",
        "ORDERCLOUD_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

## Available Tools

### Health & Auth
- **ordercloud.ping** — Check connectivity, auth mode, and token status

### Products
- **ordercloud.products.search** — List/search products with filters, pagination, sorting
- **ordercloud.products.get** — Get a product by ID
- **ordercloud.products.create** — Create a new product
- **ordercloud.products.patch** — Partial update (merge patch)
- **ordercloud.products.delete** — Delete a product

### Catalogs & Categories
- **ordercloud.catalogs.list** — List catalogs
- **ordercloud.categories.search** — Search categories in a catalog
- **ordercloud.categories.get** — Get a category by ID

### Buyers & Users
- **ordercloud.buyers.search** — Search buyer organizations
- **ordercloud.users.search** — Search users in a buyer org
- **ordercloud.users.get** — Get a user by ID

### Orders
- **ordercloud.orders.search** — Search orders with direction, status, date range
- **ordercloud.orders.get** — Get an order by ID
- **ordercloud.orders.getWorksheet** — Get full order worksheet (order + line items + payments)

### XP (Extended Properties)
- **ordercloud.xp.get** — Read xp from any resource
- **ordercloud.xp.patch** — Safely deep-merge xp updates (validates size and key names)

## Example Tool Calls

```
# Check connectivity
ordercloud.ping {}

# Search active products
ordercloud.products.search { "filters": { "Active": "true" }, "pageSize": 10 }

# Get order worksheet
ordercloud.orders.getWorksheet { "direction": "Incoming", "orderId": "ORD-001" }

# Update product xp
ordercloud.xp.patch {
  "resourceType": "Product",
  "identifiers": { "productId": "PROD-001" },
  "xpPatch": { "color": "blue", "metadata": { "source": "import" } }
}
```

## Recommended OrderCloud Scopes

| Tool Group | Minimum Scopes |
|---|---|
| Products | `ProductAdmin` or `ProductReader` |
| Catalogs/Categories | `CatalogAdmin` or `CatalogReader` |
| Buyers/Users | `BuyerAdmin` or `BuyerReader` |
| Orders | `OrderAdmin` or `OrderReader` |
| Full access | `FullAccess` |

Use `ProductReader`, `CatalogReader`, etc. for read-only operations to follow least-privilege.

## Sandbox vs Production

- **Sandbox**: `ORDERCLOUD_BASE_URL=https://sandboxapi.ordercloud.io` (default)
- **Production**: `ORDERCLOUD_BASE_URL=https://api.ordercloud.io`

Always test in sandbox first. The `ordercloud.ping` tool confirms which environment you're connected to.

## Security Notes

- Secrets are never logged; tokens are masked in stderr output
- Token caching with automatic refresh before expiry
- Exponential backoff retry on 429/5xx responses
- XP patch validates payload size (64KB limit) and rejects `$`-prefixed keys
