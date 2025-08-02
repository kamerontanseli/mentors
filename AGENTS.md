# AGENTS.md

## Build, Lint, and Run Commands
- Install dependencies: `bun install`
- Start dev server: `bun dev`
- Run production: `bun start`
- Build: `bun run build.ts`
- Lint: `bun lint`
- **No test script or framework detected.**

## Code Style Guidelines
- **Language:** TypeScript (strict mode, ESNext)
- **JSX:** Use `react-jsx` transform
- **Imports:** Use ES modules; path alias `@/` maps to `src/`
- **Linting:** ESLint with recommended, strict, and stylistic configs (see `eslint.config.mjs`)
- **Formatting:** No Prettier config; follow ESLint stylistic rules
- **Types:** Prefer explicit types, leverage TypeScript strictness
- **Naming:** Use camelCase for variables/functions, PascalCase for components/types
- **Error Handling:** Use try/catch for async code, handle errors gracefully
- **Other:** No Cursor or Copilot rules present

_This file is for agentic coding agents. Update if project conventions change._
