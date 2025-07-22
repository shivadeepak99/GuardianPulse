# Code Quality & Style Guide

This document outlines the code quality standards and development workflow for GuardianPulse.

## Overview

GuardianPulse enforces strict code quality standards using:
- **ESLint** for code linting and best practices
- **Prettier** for consistent code formatting
- **TypeScript** for type safety
- **Husky** for pre-commit hooks
- **lint-staged** for staged file processing

## Tools Configuration

### ESLint
- Uses the new flat config format (`eslint.config.js`)
- TypeScript-aware with `@typescript-eslint` rules
- Prettier integration for formatting
- Custom rules for security and best practices

### Prettier
- 120 character line width
- Single quotes for strings
- Trailing commas everywhere
- 2-space indentation
- LF line endings

### Pre-commit Hooks
Automatically runs on every commit:
1. Format code with Prettier
2. Fix auto-fixable ESLint issues
3. Type check with TypeScript

## Available Scripts

### API Package (`packages/api`)
```bash
# Linting
pnpm run lint          # Check for linting issues
pnpm run lint:fix      # Fix auto-fixable issues

# Formatting
pnpm run format        # Format all TypeScript files
pnpm run format:check  # Check if files are formatted

# Type checking
pnpm run typecheck     # Run TypeScript compiler check

# All quality checks
pnpm run code-quality  # Run typecheck + lint + format:check
```

### Root Level
```bash
# Run commands across all packages
pnpm run lint          # Lint all packages
pnpm run format        # Format all packages
pnpm run code-quality  # Quality check all packages
```

## VS Code Integration

The workspace includes VS Code settings for:
- Format on save
- Auto-fix ESLint issues on save
- TypeScript auto-imports
- Consistent line endings

## Development Workflow

1. **Write Code**: Follow TypeScript best practices
2. **Save Files**: Auto-formatting applied
3. **Commit**: Pre-commit hooks ensure quality
4. **CI/CD**: Automated quality checks in pipeline

## Code Quality Rules

### TypeScript Rules
- Explicit function return types (warning)
- No `any` types (error)
- Unused variables must be prefixed with `_`
- Prefer nullish coalescing and optional chaining
- No non-null assertions

### Security Rules
- No `eval()` usage
- No `new Function()` usage
- No implied eval

### Style Rules
- Console statements are warnings (with disable comments)
- Prefer const over let
- No var declarations
- Consistent import ordering

## Overriding Rules

When necessary, use ESLint disable comments:
```typescript
// eslint-disable-next-line no-console
console.log('Server started');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyApi();
```

## Continuous Integration

All quality checks should pass before merging:
```bash
pnpm run code-quality
```

This ensures:
- ✅ TypeScript compilation
- ✅ ESLint rules compliance  
- ✅ Prettier formatting
- ✅ No type errors
