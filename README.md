# Mentor Group

A modern React + TypeScript web application template powered by Bun, with Tailwind CSS and strict linting. Designed for rapid prototyping and scalable frontend development.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build.ts

# Run production server
bun start

# Lint code
bun lint
```

## Features
- React 19 with JSX (`react-jsx` transform)
- TypeScript (strict mode, ESNext)
- Bun runtime and package manager
- Tailwind CSS (via bun-plugin-tailwind)
- ESLint with strict and stylistic configs
- Path alias: `@/` → `src/`

## Directory Structure
```
src/
  AiCoachesApp.tsx
  App.tsx
  ...
build.ts
bunfig.toml
eslint.config.mjs
package.json
```

## Code Style
- See [AGENTS.md](./AGENTS.md) for agentic coding conventions and style guidelines.

## Contributing
Pull requests and issues are welcome! Please follow the code style and linting rules.

---
Created with Bun v1.2.8. See [Bun documentation](https://bun.sh) for more info.
