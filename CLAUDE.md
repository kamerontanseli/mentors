# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Core Development:**
- `bun install` - Install dependencies
- `bun dev` - Start development server with hot reload
- `bun start` - Run production server
- `bun run build.ts` - Build for production
- `bun lint` - Lint TypeScript code

**Build Script Options:**
The build script supports various CLI arguments:
- `--outdir <path>` - Output directory (default: "dist")
- `--minify` - Enable minification
- `--source-map <type>` - Sourcemap type: none|linked|inline|external
- Splitting and other Bun build options are supported

## Architecture Overview

**Technology Stack:**
- Runtime: Bun with ES modules
- Framework: React 19 with JSX transform
- Styling: Tailwind CSS via bun-plugin-tailwind
- Language: TypeScript (strict mode)
- Linting: ESLint with recommended, strict, and stylistic configs

**Application Structure:**
- Single-page application with tabbed interface (Chat, History, Settings)
- Main component: `AiCoachesApp.tsx` - Core application logic
- Entry point: `src/index.tsx` - Bun server with HTML serving
- Frontend: `src/frontend.tsx` - React app initialization

**Key Features:**
- Multi-AI coach chat interface using OpenRouter API
- Model selection with reasoning mode support
- Chat history management with localStorage persistence
- Custom coach creation and management
- Real-time streaming responses
- Markdown rendering for coach responses

**Data Flow:**
1. User interactions trigger state updates in React
2. Messages are sent to OpenRouter API via streaming fetch
3. Responses are processed and stored in localStorage
4. UI updates react to state changes in real-time

**File Structure:**
```
src/
├── AiCoachesApp.tsx    # Main application component (1,642 lines)
├── App.tsx            # Root app component
├── frontend.tsx       # React initialization
├── index.tsx          # Bun server entry point
├── index.html         # HTML template
├── index.css          # Global styles
├── api.json           # OpenRouter model definitions
└── logo.svg           # App icon
```

**Development Notes:**
- The main component is very large and could benefit from modularization
- Uses extensive localStorage persistence for state management
- Implements custom streaming for AI responses
- Uses Fuse.js for model search functionality
- Error handling is comprehensive with retry mechanisms