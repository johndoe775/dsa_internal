
# Chatbot UI (React + Vite)

This UI provides:
- **Policy tabs (8)** displayed at the top in **two rows** (4 per row).
- **Conversation area**.
- **Prompt input** with a **plus (+) upload button** and **arrow (→) send button**, matching Copilot-like layout.

## Files
- `src/components/PolicyTabs.jsx` – renders the 8 policy tabs across two rows.
- `src/components/ChatbotUI.jsx` – main chatbot UI wrapper.
- `src/assets/plus.svg`, `src/assets/arrow.svg` – icons for upload and send.
- `src/styles/chatbot.css` – styles.

## Usage
Place these under your existing `frontend/` app (Vite):

```
frontend/
  src/
    components/
      PolicyTabs.jsx
      ChatbotUI.jsx
    assets/
      plus.svg
      arrow.svg
    styles/
      chatbot.css
```

### Import into your app
```jsx
// frontend/src/App.jsx
import ChatbotUI from "./components/ChatbotUI";

function App() {
  return (
    <div style={{ padding: 16 }}>
      <ChatbotUI />
    </div>
  );
}
export default App;
```

### Run
```bash
cd frontend
npm run dev
```

### Notes
- The `ChatbotUI` component expects exactly 8 policies by default, but you can pass your own array.
- The upload (+) opens a file chooser; you’ll receive selected files in `onUpload` callback.
- The send (→) calls `onSend(prompt, activePolicy, attachments)`.
- No external libraries required.
