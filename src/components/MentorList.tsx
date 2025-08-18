import React from "react";
import { HandFist, Shield, FlaskConical, Scroll } from "lucide-react";

export interface Mentor {
  name: string;
  emoji: string;
  // avatar removed – using emoji instead of profile pictures
}

export const mentors: Mentor[] = [
  { name: "David Goggins", emoji: "💪" },
  { name: "Jocko Willink", emoji: "🪖" },
  { name: "Tim Ferriss", emoji: "🧪" },
  { name: "Marcus Aurelius", emoji: "🏛️" },
];

// Color mapping for each mentor (softer Tailwind text color classes)
export const mentorColors: Record<string, string> = {
  "David Goggins": "text-red-400",
  "Jocko Willink": "text-blue-400",
  "Tim Ferriss": "text-green-400",
  "Marcus Aurelius": "text-purple-400",
};

interface MentorListProps {
  onSelect: (mentors: Mentor[]) => void;
}

export const MentorList: React.FC<MentorListProps> = ({ onSelect }) => {
  const [selected, setSelected] = React.useState<Mentor[]>([]);

  const toggleSelect = (mentor: Mentor) => {
    setSelected((prev) =>
      prev.find((m) => m.name === mentor.name)
        ? prev.filter((m) => m.name !== mentor.name)
        : [...prev, mentor]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-primary text-primary p-4">
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-semibold">Select a Mentor</h1>
      </div>
      <ul className="space-y-3">
        {mentors.map((mentor) => {
          const isSelected = selected.some((m) => m.name === mentor.name);
          return (
            <li
              key={mentor.name}
              className={`flex items-center p-4 ${isSelected ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'} rounded-xl shadow-md cursor-pointer transition-colors`}
              onClick={() => toggleSelect(mentor)}
            >
              <div className={`flex items-center justify-center w-10 h-10 bg-gray-600 ${mentorColors[mentor.name] || 'text-white'} rounded-full mr-3 flex-shrink-0`}>
                {(() => {
                  switch (mentor.name) {
                    case "David Goggins":
                      return <HandFist className={`w-6 h-6 ${mentorColors[mentor.name]}`} />;
                    case "Jocko Willink":
                      return <Shield className={`w-6 h-6 ${mentorColors[mentor.name]}`} />;
                    case "Tim Ferriss":
                      return <FlaskConical className={`w-6 h-6 ${mentorColors[mentor.name]}`} />;
                    case "Marcus Aurelius":
                      return <Scroll className={`w-6 h-6 ${mentorColors[mentor.name]}`} />;
                    default:
                      return null;
                  }
                })()}
              </div>
              <span className={`text-lg ${mentorColors[mentor.name] || 'text-white'}`}>{mentor.name}</span>
            </li>
          );
        })}
      </ul>
      {selected.length > 0 && (
        <button
          className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl"
          onClick={() => onSelect(selected)}
        >
          Start Group Chat
        </button>
      )}
    </div>
  );
};
