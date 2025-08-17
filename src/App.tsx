import { useState, useEffect } from 'react';
import './index.css';
import { mentors } from './components/MentorList';
import { MentorChat } from './components/MentorChat';


function ApiKeyPrompt({ onSave }: { onSave: (key: string) => void }) {
  const [key, setKey] = useState('');
  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('GROQ_API_KEY', key.trim());
      onSave(key.trim());
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary text-primary p-4">
      <h2 className="text-xl mb-4">Enter your Groq API Key</h2>
      <input
        type="password"
        placeholder="GROQ API Key"
        className="bg-surface text-primary rounded-md p-2 mb-4 w-80"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <button
        onClick={handleSave}
        className="bg-success text-primary rounded-md px-4 py-2"
      >
        Save
      </button>
    </div>
  );
}

export function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('GROQ_API_KEY');
    if (stored) setApiKey(stored);
  }, []);

  if (!apiKey) {
    return <ApiKeyPrompt onSave={setApiKey} />;
  }

  return (
    <div className="bg-black min-h-screen text-white">
<MentorChat mentors={mentors} apiKey={apiKey} />
    </div>
  );
}

export default App;
