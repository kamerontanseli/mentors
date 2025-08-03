export interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ApiMessage[];
  maxTokens: number;
  temperature?: number;
  stream: boolean;
}

export interface StreamResponse {
  choices?: {
    delta?: {
      content?: string;
    };
  }[];
}

export interface ApiError {
  error?: {
    message?: string;
  };
}