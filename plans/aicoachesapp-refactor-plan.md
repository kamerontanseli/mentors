# AiCoachesApp.tsx Refactoring Plan

## Current Issues
- Single file with 1,642 lines containing all application logic
- Mixed concerns: UI, state management, API calls, localStorage operations
- Difficult to test individual components
- Hard to maintain and extend
- Duplicate code patterns throughout

## Refactoring Strategy

### 1. Extract Custom Hooks

**useLocalStorage Hook**
```ts
function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void]
```
- Centralize localStorage operations
- Handle errors consistently
- Used for: API key, model selection, reasoning mode, coaches, chat history

**useChatHistory Hook**
```ts
function useChatHistory(): {
  chatHistory: ChatHistory[]
  currentChatId: string | null
  saveCurrentChat: () => void
  loadChat: (id: string) => void
  deleteChat: (id: string) => void
  newChat: () => void
}
```
- Manage chat persistence and operations
- Handle auto-saving logic
- Encapsulate chat state management

**useApiClient Hook**
```ts
function useApiClient(): {
  sendMessage: (messages: ChatMessage[], model: string, options: ApiOptions) => Promise<ReadableStream>
  availableModels: AvailableModel[]
}
```
- Handle OpenRouter API communication
- Manage streaming responses
- Centralize error handling

### 2. Component Extraction

**ChatInterface Component**
```tsx
function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  error, 
  onRetry 
})
```
- Message display and input
- Streaming message updates
- Error handling UI

**MessageList Component**
```tsx
function MessageList({ messages, onCopyMessage })
```
- Render individual messages
- Handle message types (user/coach/system)
- Copy functionality

**MessageInput Component**
```tsx
function MessageInput({ 
  value, 
  onChange, 
  onSend, 
  disabled, 
  placeholder 
})
```
- Input field with send button
- Keyboard shortcuts
- Validation

**CoachSelector Component**
```tsx
function CoachSelector({ 
  coaches, 
  selectedCoaches, 
  onSelectionChange 
})
```
- Coach selection chips
- Visual selection state
- Horizontal scrolling

**ModelSelector Component**
```tsx
function ModelSelector({ 
  models, 
  selectedModel, 
  onModelChange, 
  searchable 
})
```
- Modal with model search
- Grouped by provider
- Reasoning capability indicators

**CoachManager Component**
```tsx
function CoachManager({ 
  coaches, 
  onAddCoach, 
  onUpdateCoach, 
  onDeleteCoach 
})
```
- CRUD operations for coaches
- AI prompt generation
- Form validation

**ChatHistoryView Component**
```tsx
function ChatHistoryView({ 
  chatHistory, 
  currentChatId, 
  onLoadChat, 
  onDeleteChat 
})
```
- Display chat list
- Search and filter
- Bulk operations

**SettingsView Component**
```tsx
function SettingsView({ 
  apiKey, 
  onApiKeyChange, 
  model, 
  onModelChange, 
  useReasoning, 
  onReasoningChange 
})
```
- Configuration options
- API key management
- Model preferences

### 3. Utility Functions

**api/openrouter.ts**
```ts
export async function streamChatCompletion(params: ChatParams): Promise<ReadableStream>
export function parseStreamChunk(chunk: string): string | null
export function getAvailableModels(): AvailableModel[]
```

**utils/storage.ts**
```ts
export function saveToStorage<T>(key: string, value: T): void
export function loadFromStorage<T>(key: string, defaultValue: T): T
export function removeFromStorage(key: string): void
```

**utils/chat.ts**
```ts
export function generateChatTitle(messages: MessageType[]): string
export function formatMessageForApi(message: MessageType): ApiMessage
export function createUserMessage(content: string): MessageType
```

### 4. Type Definitions

**types/chat.ts** (already exists)
- Keep existing types
- Add missing interfaces

**types/api.ts**
```ts
export interface ApiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatParams {
  model: string
  messages: ApiMessage[]
  maxTokens: number
  temperature?: number
  stream: boolean
}
```

### 5. Context Providers

**AppContext**
```tsx
const AppContext = createContext<{
  apiKey: string
  setApiKey: (key: string) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  useReasoning: boolean
  setUseReasoning: (enabled: boolean) => void
}>()
```

### 6. File Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── CoachSelector.tsx
│   ├── coaches/
│   │   └── CoachManager.tsx
│   ├── history/
│   │   └── ChatHistoryView.tsx
│   ├── settings/
│   │   └── SettingsView.tsx
│   ├── modals/
│   │   ├── ApiKeyModal.tsx
│   │   └── ModelSelectorModal.tsx
│   └── ui/
│       ├── TabNavigation.tsx
│       └── StatusBar.tsx
├── hooks/
│   ├── useLocalStorage.ts
│   ├── useChatHistory.ts
│   └── useApiClient.ts
├── api/
│   └── openrouter.ts
├── utils/
│   ├── storage.ts
│   └── chat.ts
├── context/
│   └── AppContext.tsx
├── types/
│   ├── chat.ts (existing)
│   └── api.ts
└── AiCoachesApp.tsx (refactored main component)
```

### 7. Implementation Steps

1. **Extract utility functions** - Start with storage and API utilities
2. **Create custom hooks** - Move state logic to reusable hooks
3. **Extract UI components** - Break down the monolithic component
4. **Add context providers** - Share global state efficiently
5. **Refactor main component** - Compose smaller components
6. **Add error boundaries** - Improve error handling
7. **Optimize performance** - Add React.memo where appropriate

### 8. Benefits

- **Maintainability**: Smaller, focused components
- **Testability**: Individual units can be tested
- **Reusability**: Components can be reused
- **Performance**: Better optimization opportunities
- **Developer Experience**: Easier to understand and modify
- **Type Safety**: Better TypeScript support
- **Code Organization**: Clear separation of concerns