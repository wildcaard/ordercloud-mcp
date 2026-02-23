# Contributing to ordercloud-mcp

Thank you for your interest in contributing to the OrderCloud MCP Server! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Commit Message Format](#commit-message-format)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ordercloud-mcp.git`
3. Create a new branch for your feature or bugfix

## Development Setup

### Prerequisites

- Node.js >= 20
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ordercloud-mcp.git
cd ordercloud-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode (watch for changes)
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure your OrderCloud credentials:

```bash
cp .env.example .env
# Edit .env with your OrderCloud credentials
```

## Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. Make your changes following the coding standards

3. Test your changes:
   ```bash
   npm run build
   ```

4. Commit your changes (see commit message format below)

5. Push to your fork and create a pull request

## Pull Request Process

### Before Submitting

1. Ensure all tests pass and the build succeeds
2. Update documentation if your changes affect the API
3. Update the CHANGELOG.md if your changes are notable
4. Ensure your code follows the coding standards

### Pull Request Checklist

- [ ] I have tested my changes locally
- [ ] The build passes (`npm run build`)
- [ ] My code follows the project's coding standards
- [ ] I have updated relevant documentation
- [ ] I have added tests for new functionality (if applicable)
- [ ] CHANGELOG.md is updated with notable changes

### Pull Request Description

Include in your pull request description:

1. **Summary**: Brief description of what the PR does
2. **Related Issues**: Link to any related issues (e.g., "Fixes #123")
3. **Type of Change**: Bug fix, feature, documentation update, etc.
4. **Testing**: How you tested the changes
5. **Screenshots**: If UI changes are involved

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect the meaning of the code (formatting)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `chore`: Changes to build process, dependencies, etc.

### Examples

```
feat(products): add setDefaultPrice tool
fix(xp): validate XP size before patch
docs(readme): update installation instructions
refactor(client): extract retry logic to helper function
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use Zod for runtime validation

### File Organization

```
src/ordercloud/
├── index.ts           # Main entry point
├── client.ts          # API client
├── tools.ts           # Tool registration
├── helpers/           # Shared utilities
├── types/             # TypeScript types
└── resources/         # Resource-specific modules
    ├── products.ts
    ├── orders.ts
    └── ...
```

### Naming Conventions

- **Tools**: `ordercloud.<resource>.<action>` (e.g., `ordercloud.products.search`)
- **Files**: kebab-case (e.g., `order-history.ts`)
- **Functions**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE

### Tool Registration Pattern

When adding new tools, follow this pattern:

```typescript
export function registerProductTools(server: McpServer, client: OrderCloudClient): void {
  server.registerTool(
    "ordercloud.products.search",
    {
      description: "List or search products",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({
        search: z.string().optional(),
        filters: z.record(z.string()).optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    },
    async (params) => {
      try {
        // Implementation
        return ok(result);
      } catch (e) {
        return err(e);
      }
    }
  );
}
```

### Response Format

All tools should return responses in this format:

```typescript
// Success
return ok({
  // data
});

// Error
return err(error);
```

See `src/ordercloud/helpers/index.ts` for helper functions.

## Testing

### Building

```bash
npm run build
```

### Type Checking

The build process includes TypeScript type checking. Ensure no type errors are present.

## Documentation

### README.md

Update the README.md if you:
- Add or remove tools
- Change configuration options
- Add new dependencies
- Change the installation process

### Tool Descriptions

When adding new tools, include in the README:
- Tool name
- Description
- Input parameters
- Example usage

### CHANGELOG.md

Update CHANGELOG.md for:
- New features
- Bug fixes
- Breaking changes
- Deprecations

## Questions?

If you have questions, please open an issue with the "question" label or start a discussion in the GitHub Discussions tab.

---

Thank you for contributing!
