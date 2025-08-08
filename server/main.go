package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

type Client struct {
	conn *websocket.Conn
	room string
	id   string
}

type Message struct {
	SenderID  string `json:"sender_id"`
	Text      string `json:"text"`
	Timestamp int64  `json:"timestamp"`
}

type UserCountMessage struct {
	Type      string `json:"type"`
	UserCount int    `json:"user_count"`
}

var (
	rooms = make(map[string][]*Client)
	mu    sync.Mutex
	rdb   *redis.Client
	ctx   = context.Background()
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func normalizeRoom(url string) string {
	url = strings.TrimSuffix(url, "/")
	return url
}

func saveMessage(room string, msg Message) {
	data, _ := json.Marshal(msg)
	rdb.RPush(ctx, "room:"+room, data)
	rdb.LTrim(ctx, "room:"+room, -100, -1)
}

func getMessageHistory(room string) []Message {
	msgs := []Message{}
	data, _ := rdb.LRange(ctx, "room:"+room, 0, -1).Result()
	for _, d := range data {
		var m Message
		if err := json.Unmarshal([]byte(d), &m); err == nil {
			msgs = append(msgs, m)
		}
	}
	return msgs
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	room := normalizeRoom(r.URL.Query().Get("room"))
	client := &Client{conn: conn, room: room, id: fmt.Sprintf("user-%d", time.Now().UnixNano())}

	mu.Lock()
	rooms[room] = append(rooms[room], client)
	mu.Unlock()

	// Send history
	history := getMessageHistory(room)
	for _, msg := range history {
		data, _ := json.Marshal(msg)
		client.conn.WriteMessage(websocket.TextMessage, data)
	}

	// Broadcast user count update to all clients in room
	broadcastUserCount(room)

	defer func() {
		mu.Lock()
		for i, c := range rooms[room] {
			if c == client {
				rooms[room] = append(rooms[room][:i], rooms[room][i+1:]...)
				break
			}
		}
		mu.Unlock()
		conn.Close()
		// Broadcast updated user count when user leaves
		broadcastUserCount(room)
	}()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		msg := Message{
			SenderID:  client.id,
			Text:      string(data),
			Timestamp: time.Now().Unix(),
		}
		saveMessage(room, msg)
		broadcast(room, msg, client)
	}
}

func broadcast(room string, msg Message, sender *Client) {
	data, _ := json.Marshal(msg)
	mu.Lock()
	defer mu.Unlock()
	for _, client := range rooms[room] {
		if client != sender {
			client.conn.WriteMessage(websocket.TextMessage, data)
		}
	}
}

func broadcastUserCount(room string) {
	mu.Lock()
	userCount := len(rooms[room])
	clients := rooms[room]
	mu.Unlock()

	countMsg := UserCountMessage{
		Type:      "user_count",
		UserCount: userCount,
	}
	data, _ := json.Marshal(countMsg)

	for _, client := range clients {
		client.conn.WriteMessage(websocket.TextMessage, data)
	}
}

func main() {
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	http.HandleFunc("/ws", handleWS)
	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", nil)
}