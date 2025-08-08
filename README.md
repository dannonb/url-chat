# URL Chat Extension

A browser extension + Go backend that enables real-time chat between users visiting the same webpage — like Twitch chat, but for any URL.

---

## 🧩 Features

- Real-time chat between users on the same URL
- Browser extension popup interface
- Go WebSocket server backend
- Message history stored in Redis (up to 100 messages per room)

---

## 📁 Project Structure

```
url-chat-extension/
├── backend/            # Go WebSocket server
│   └── main.go
│
├── extension/          # Browser extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── background.js
│   └── icon.png
```

---

## 🚀 Getting Started

### 1. Run Redis (if not installed)

```bash
docker run -p 6379:6379 redis
```

### 2. Start the Go backend server

```bash
cd backend
go run main.go
```

Backend will run at: `ws://localhost:8080/ws`

---

## 🧪 Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `extension/` directory

---

## 💬 How It Works

- The extension detects the current page URL
- It connects to the backend via WebSocket and joins a room based on `origin + pathname`
- Messages are shared between users in the same room
- Redis stores the last 100 messages per room

---

## ✅ To-Do (Future Ideas)

- Use `wss://` and deploy backend with HTTPS
- Add usernames or anonymous IDs
- Allow emoji reactions and chat moderation
- Persist messages to a database

---

## 📄 License

MIT
