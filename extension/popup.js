(async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab[0].url);
  const room = url.origin + url.pathname;
  const socket = new WebSocket(`ws://localhost:8080/ws?room=${encodeURIComponent(room)}`);

  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("input");
  const userCountDiv = document.getElementById("userCount");
  const charCounter = document.getElementById("charCounter");

  let currentUserId = null;

  // Profanity filter - basic word list (can be expanded)
  const badWords = [
    'shit', 'fuck', 'bitch', 'ass', 'bastard',
    'piss', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
    'retard', 'gay', 'stupid', 'idiot', 'moron'
  ];

  function filterProfanity(text) {
    let filteredText = text;
    badWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    return filteredText;
  }

  // Generate a consistent color based on user ID
  function getUserColor(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate vibrant colors
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

    const color1 = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const color2 = `hsl(${(hue + 30) % 360}, ${saturation}%, ${lightness - 10}%)`;

    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }

  function addMessage(text, userId = null, timestamp = null) {
    const el = document.createElement("div");
    const isCurrentUser = userId === currentUserId;
    el.className = `message ${isCurrentUser ? 'user' : 'other'} fade-in`;

    // Set unique color based on user ID
    if (userId) {
      el.style.background = getUserColor(userId);
    }

    const ts = timestamp || new Date().toLocaleTimeString();

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = filterProfanity(text);
    el.appendChild(contentDiv);

    // Add timestamp below message
    const timestampDiv = document.createElement("div");
    timestampDiv.className = "message-timestamp";
    timestampDiv.textContent = ts;
    el.appendChild(timestampDiv);

    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function updateUserCount(count) {
    const text = count === 1 ? "1 user online" : `${count} users online`;
    userCountDiv.textContent = text;
  }

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "user_count") {
      updateUserCount(data.user_count);
    } else {
      // Regular message
      const ts = new Date(data.timestamp * 1000).toLocaleTimeString();
      addMessage(data.text, data.sender_id, ts);
    }
  });

  // Generate a unique user ID for this session
  currentUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // Update character counter
  function updateCharCounter() {
    const length = input.value.length;
    const remaining = 240 - length;
    charCounter.textContent = `${length}/240`;

    if (remaining <= 20) {
      charCounter.classList.add('warning');
    } else {
      charCounter.classList.remove('warning');
    }
  }

  // Character counter on input
  input.addEventListener("input", updateCharCounter);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const message = input.value.trim();

      // Show your own message immediately with current timestamp
      addMessage(message, currentUserId);

      // Send to server (send original message, filtering happens on display)
      socket.send(message);

      // Clear input
      input.value = "";
      updateCharCounter();
    }
  });
})();