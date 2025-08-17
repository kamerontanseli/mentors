# iMessage Chat with Mentors

Create an iMessage clone where the user sends chat messages (blue bubbles) to mentors:
- David Goggins
- Jocko Willink
- Tim Ferriss
- Marcus Aurelius

The mentors should respond using the Groq API and the model "gpt-oss 20b" as gray messages. Do not show reasoning; display only their final output.

## Functionality
- User can start a new conversation.
- User can copy messages.
- User can regenerate messages.
- Each message has an emoji next to it to indicate which mentor/AI said the message.

## Tech stack
- React
- Tailwind
- Typescript
- Lucide react icons
- Groq API (use process.env.GROQ_API_KEY)

## UI
The UI should replicate the iMessage app on an iPhone, based on the following detailed breakdown:

### 1. Overall Layout & Device Frame
- **Device:** Frame the interface as if viewed on an iPhone, including rounded corners and the notch at the top (similar to iPhone X or later models).
- **Dark Mode:** Use a predominantly black background for the interface.

### 2. Top Bar
- **Time:** Display the current time (e.g., "9:41") in the top-left corner.
- **Cellular/Wi-Fi Signal:** Show indicators for cellular signal strength and Wi-Fi connectivity in the top-right corner.
- **Back Arrow:** Include a back arrow ("<") on the top-left to return to the main conversation list.
- **Contact Name:** Display the mentor's name (e.g., "David Goggins >") between the back arrow and the message thread.

### 3. Message Thread
- **Message Bubbles:**
  - Blue bubbles for messages sent by the user, aligned to the right.
  - Gray bubbles for messages received from mentors, aligned to the left.
- **Profile Pictures:** Display small circular profile pictures at the top of each message bubble, representing the sender.
- **Message Content:** Show text-based messages in the bubbles.
- **Timestamp:** Display timestamps (e.g., "Today 5:41 AM") below messages to indicate when they were sent.
- **Emoji:** Include emojis in messages where appropriate for informality.

### 4. Input Area (Bottom)
- **Text Input Field:** A white text input field at the bottom, labeled "iMessage," for typing messages.
- **Microphone Icon:** A microphone icon to the right of the text input field for sending voice messages.
- **Send Button:** A send button to the right of the microphone icon.

### 5. Visual Details & Style
- **Rounded Corners:** Apply to message bubbles and the input field for a modern, soft aesthetic.
- **Clean Typography:** Use a standard iOS system font for clear, readable text.
- **Minimalist Design:** Focus on message content with minimal visual elements.

In summary, the UI should be a functional, user-friendly representation of the iMessage app, optimized for text-based communication with mentors.
