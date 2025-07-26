(async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab[0].url);
  const room = url.origin + url.pathname;
  const socket = new WebSocket(`ws://localhost:8080/ws?room=${encodeURIComponent(room)}`);

  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("input");

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const el = document.createElement("div");
    const ts = new Date(msg.timestamp * 1000).toLocaleTimeString();
    el.textContent = `[${ts}] ${msg.text}`;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      socket.send(input.value.trim());
      input.value = "";
    }
  });
})();