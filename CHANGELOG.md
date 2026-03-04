# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-03-04

### Added

#### MCP Prompts (12 workflow prompts)
- **Product**: `ordercloud:product.create-full`, `ordercloud:product.bulk-import`, `ordercloud:product.update-pricing`
- **Order**: `ordercloud:order.fulfill`, `ordercloud:order.approve`, `ordercloud:order.analyze`
- **Analysis**: `ordercloud:analyze.order-trends`, `ordercloud:analyze.product-performance`, `ordercloud:analyze.customer-activity`
- **Bulk**: `ordercloud:bulk.activate-products`, `ordercloud:bulk.update-inventory`, `ordercloud:bulk.assign-categories`

#### Composite Tools (5 multi-step tools)
- `ordercloud.products.createFull` — Create product with price schedule, specs, variants, and category assignments in one call
- `ordercloud.orders.fulfill` — Get worksheet, create shipment, add line items, optionally update order status
- `ordercloud.customers.onboard` — Create buyer, default user, default address, assign default catalog
- `ordercloud.products.bulkActivate` — Activate/deactivate multiple products with success/failure summary
- `ordercloud.orders.generateReport` — Search orders in date range and return aggregated metrics (revenue, status breakdown)

#### Bulk Product Operations
- `ordercloud.bulk.products.create` — Create multiple products (client-side batching, configurable batchSize)
- `ordercloud.bulk.products.patch` — Patch multiple products
- `ordercloud.bulk.products.delete` — Delete multiple products
- `ordercloud.bulk.products.activate` — Activate or deactivate multiple products

#### Dry-Run Mode
- Optional `dryRun: true` on `ordercloud.products.create`, `ordercloud.products.patch`, `ordercloud.products.delete`
- Returns `{ wouldSucceed, validatedData, warnings }` without persisting to the API

#### Audit Logging
- In-memory audit log for all mutations (`src/ordercloud/helpers/audit.ts`)
- `ordercloud.audit.export` tool — Export full audit log (count, entries, exportedAt)
- `ordercloud://audit/log` MCP resource — Read audit log as JSON
- **Audit on every mutation tool**: All create/patch/delete/submit/assign-style tools across all resource modules and composite tools now record audit entries (operation, toolName, resourceType, resourceId, paramsSanitized, success, errorMessage). Covers: products, catalogs, categories, buyers, users, orders, xp, suppliers, addresses, priceSchedules, specs, promotions, shipments, payments, lineItems, costCenters, spendingAccounts, bulk product tools, and composite tools (createFull, fulfill, onboard, bulkActivate).

## [1.0.1] - 2026-02-23

### Added

- Test suite with 42 unit tests covering helper functions
- GitHub Actions CI/CD workflow with automated build, lint, test, and publish
- CONTRIBUTING.md documentation
- CHANGELOG.md documentation

### Changed

- Updated package.json for npm publishing (exports, repository, keywords)
- Improved README.md with npm badges

## [1.0.0] - 2026-02-23

### Added

#### MCP Tools (48+ tools across 15 resource categories)

**Health & Authentication**
- `ordercloud.ping` - Check OrderCloud connectivity, auth mode, and token status

**Products**
- `ordercloud.products.search` - List/search products with filters, pagination, sorting
- `ordercloud.products.get` - Get a product by ID
- `ordercloud.products.create` - Create a new product
- `ordercloud.products.patch` - Partial update (merge patch)
- `ordercloud.products.delete` - Delete a product
- `ordercloud.products.setDefaultPrice` - Set default price for product

**Catalogs**
- `ordercloud.catalogs.list` - List catalogs
- `ordercloud.catalogs.get` - Get a catalog by ID
- `ordercloud.catalogs.create` - Create a new catalog
- `ordercloud.catalogs.patch` - Update a catalog
- `ordercloud.catalogs.delete` - Delete a catalog

**Categories**
- `ordercloud.categories.search` - Search categories in a catalog
- `ordercloud.categories.get` - Get a category by ID
- `ordercloud.categories.create` - Create a new category
- `ordercloud.categories.patch` - Update a category
- `ordercloud.categories.delete` - Delete a category

**Buyers**
- `ordercloud.buyers.search` - Search buyer organizations
- `ordercloud.buyers.get` - Get a buyer by ID
- `ordercloud.buyers.create` - Create a new buyer
- `ordercloud.buyers.patch` - Update a buyer
- `ordercloud.buyers.delete` - Delete a buyer

**Users**
- `ordercloud.users.search` - Search users in a buyer org
- `ordercloud.users.get` - Get a user by ID
- `ordercloud.users.create` - Create a new user
- `ordercloud.users.patch` - Update a user
- `ordercloud.users.delete` - Delete a user

**Orders**
- `ordercloud.orders.search` - Search orders with direction, status, date range
- `ordercloud.orders.get` - Get an order by ID
- `ordercloud.orders.create` - Create a new order
- `ordercloud.orders.patch` - Update an order
- `ordercloud.orders.delete` - Delete an order
- `ordercloud.orders.getWorksheet` - Get full order worksheet (order + line items + payments)
- `ordercloud.orders.submit` - Submit an order

**Suppliers**
- `ordercloud.suppliers.search` - Search suppliers
- `ordercloud.suppliers.get` - Get a supplier by ID
- `ordercloud.suppliers.create` - Create a new supplier
- `ordercloud.suppliers.patch` - Update a supplier
- `ordercloud.suppliers.delete` - Delete a supplier

**Addresses**
- `ordercloud.addresses.listForEntity` - List addresses for Buyer/User/Supplier
- `ordercloud.addresses.get` - Get address by ID
- `ordercloud.addresses.create` - Create address
- `ordercloud.addresses.patch` - Update address
- `ordercloud.addresses.delete` - Delete address

**Price Schedules**
- `ordercloud.priceSchedules.list` - List price schedules
- `ordercloud.priceSchedules.get` - Get price schedule
- `ordercloud.priceSchedules.create` - Create price schedule
- `ordercloud.priceSchedules.patch` - Update price schedule
- `ordercloud.priceSchedules.addPriceBreak` - Add price break
- `ordercloud.priceSchedules.setDefaultPrice` - Set default price

**Specs**
- `ordercloud.specs.list` - List specs
- `ordercloud.specs.get` - Get spec
- `ordercloud.specs.create` - Create spec
- `ordercloud.specs.patch` - Update spec
- `ordercloud.specs.options.list` - List spec options
- `ordercloud.specs.options.add` - Add spec option

**Promotions**
- `ordercloud.promotions.search` - Search promotions
- `ordercloud.promotions.get` - Get promotion
- `ordercloud.promotions.create` - Create promotion
- `ordercloud.promotions.patch` - Update promotion
- `ordercloud.promotions.delete` - Delete promotion
- `ordercloud.promotions.assign` - Assign promotion to buyer

**Shipments**
- `ordercloud.shipments.search` - Search shipments
- `ordercloud.shipments.get` - Get shipment
- `ordercloud.shipments.create` - Create shipment
- `ordercloud.shipments.patch` - Update shipment
- `ordercloud.shipments.addLineItem` - Add line item to shipment
- `ordercloud.shipments.listForOrder` - List shipments for order

**Payments**
- `ordercloud.payments.listForOrder` - List payments for order
- `ordercloud.payments.get` - Get payment
- `ordercloud.payments.create` - Create payment
- `ordercloud.payments.patch` - Update payment
- `ordercloud.payments.transactions.list` - List payment transactions

**Line Items**
- `ordercloud.lineItems.list` - List line items for order
- `ordercloud.lineItems.get` - Get line item
- `ordercloud.lineItems.create` - Create line item
- `ordercloud.lineItems.patch` - Update line item
- `ordercloud.lineItems.delete` - Delete line item

**Cost Centers**
- `ordercloud.costCenters.list` - List cost centers
- `ordercloud.costCenters.get` - Get cost center
- `ordercloud.costCenters.create` - Create cost center
- `ordercloud.costCenters.patch` - Update cost center
- `ordercloud.costCenters.delete` - Delete cost center

**XP (Extended Properties)**
- `ordercloud.xp.get` - Read xp from any resource
- `ordercloud.xp.patch` - Safely deep-merge xp updates (validates size and key names)

### Features

**Authentication**
- OAuth 2.0 client credentials flow support
- Pre-provided bearer token support
- Token caching with automatic refresh (60-second buffer)

**Error Handling**
- Exponential backoff retry on 429 (rate limit) and 5xx errors
- Retry-After header support for intelligent backoff
- Detailed error messages from OrderCloud API

**XP (Extended Properties)**
- 64KB payload size validation
- Key sanitization (rejects `$`-prefixed keys)
- Deep merge for XP patching operations

**Security**
- Secrets are never logged
- Tokens are masked in stderr output

### Project Structure

```
ordercloud-mcp/
├── src/
│   ├── index.ts                 # Main entry point
│   └── ordercloud/
│       ├── client.ts            # API client with token caching, retry logic
│       ├── tools.ts             # Main tool registration
│       ├── helpers/             # Shared utilities
│       ├── types/               # TypeScript type definitions
│       └── resources/           # Resource-specific tool modules
├── mcp.json                     # Claude Code configuration
├── package.json                 # NPM package definition
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Documentation
```

### Dependencies

- `@modelcontextprotocol/sdk` (^1.12.1) - MCP server implementation
- `dotenv` (^17.3.1) - Environment variable loading
- `zod` (^3.24.0) - Schema validation

### Dev Dependencies

- `@types/node` (^20.17.0) - Node.js type definitions
- `typescript` (^5.7.0) - TypeScript compiler

### Requirements

- Node.js >= 20
- npm or yarn

### Migration Notes

This is the initial release (v1.0.0.0) of the ordercloud-mcp server. If upgrading from any pre-release versions, please review your configuration as some environment variable names may have changed.

### Known Limitations

- Currently supports client credentials and bearer token authentication only
- Some advanced OrderCloud features (webhooks, message senders) not yet implemented

---

**Full documentation**: See [README.md](README.md) for setup instructions and tool usage examples.
