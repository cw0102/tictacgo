package main

import (
	"bytes"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type webClient struct {
	hub   *webHub
	conn  *websocket.Conn
	send  chan []byte
	rooms map[*room]struct{}
	name  string
}

func (c *webClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		c.hub.command <- commandBinding{c, message}
	}
}

func (c *webClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued commands to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func serveWs(hub *webHub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &webClient{hub: hub, conn: conn, send: make(chan []byte, 256), rooms: make(map[*room]struct{}), name: "Test"}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *webClient) joinRoom(roomID int) error {
	if _, ok := c.hub.rooms[roomID]; ok {
		if err := c.hub.rooms[roomID].join(c); err != nil {
			return err
		}
	} else {
		return errors.New("Failed to join room: Does not exist")
	}

	return nil
}

func (c *webClient) sendChatMessage(roomID int, timestamp string, msg string) error {
	if _, ok := c.hub.rooms[roomID]; ok {
		if err := c.hub.rooms[roomID].sendChatMessage(c, timestamp, msg); err != nil {
			return err
		}
	} else {
		return errors.New("Failed to send chat message: Room does not exist")
	}

	return nil
}

func (c *webClient) sendToClient(command string, params []string) {
	var clientString strings.Builder
	clientString.WriteString(command)
	clientString.WriteString(commandDelimiter)
	for i, p := range params {
		clientString.WriteString(p)
		if i < len(params)-1 {
			clientString.WriteString(commandDelimiter)
		}
	}
	c.send <- []byte(clientString.String())
}
