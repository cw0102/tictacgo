package main

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
)

const (
	commandStrMakeRoom  = "MKRM"
	commandStrJoinRoom  = "JOIN"
	commandStrJoinSlot  = "JNSL"
	commandStrLeaveRoom = "LEAV"
	commandStrLeaveSlot = "LVSL"
	commandStrPlay      = "PLAY"
	commandStrChat      = "CHAT"
	commandStrError     = "ERRO"
	commandStrState     = "STAT"
)

const (
	clientMaxRooms   = 20
	commandDelimiter = string(0x1E)
)

type webHub struct {
	clients    map[*webClient]struct{}
	register   chan *webClient
	unregister chan *webClient
	command    chan commandBinding
	rooms      map[int]*room
	roomCount  int
}

type commandBinding struct {
	client *webClient
	data   []byte
}

func newWebHub() *webHub {
	return &webHub{
		clients:    make(map[*webClient]struct{}),
		register:   make(chan *webClient),
		unregister: make(chan *webClient),
		command:    make(chan commandBinding),
		rooms:      make(map[int]*room),
		roomCount:  0,
	}
}

func (h *webHub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = struct{}{}
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				for room := range client.rooms {
					delete(room.members, client)
					if len(room.members) == 0 {
						delete(h.rooms, room.id)
					}
				}
				delete(h.clients, client)
				close(client.send)
			}
		case command := <-h.command:
			handleCommand(command)
		}
	}
}

func handleCommand(cb commandBinding) {
	log.Printf("Received: [%s]\n", string(cb.data))
	cmd, params := getCommandResponse(cb)
	log.Printf("Sent: [%s%s%s]\n", cmd, commandDelimiter, strings.Join(params, commandDelimiter))
	cb.client.sendToClient(cmd, params)
}

func getCommandResponse(cb commandBinding) (string, []string) {
	command := strings.Split(string(cb.data), commandDelimiter)

	if len(command) < 1 {
		err := fmt.Sprintf("error: Invalid command length: %v\n", command)
		log.Println(err)
		return commandStrError, []string{err}
	}

	switch command[0] {
	case commandStrMakeRoom: // Make Room
		return parseCommandMakeRoom(cb.client, command)
	case commandStrJoinRoom: // Join Room
		return parseCommandJoinRoom(cb.client, command)
	case commandStrJoinSlot: // Join Slot
		return parseCommandJoinSlot(cb.client, command)
	case commandStrLeaveRoom: // Leave Room
		return parseCommandLeaveRoom(cb.client, command)
	case commandStrLeaveSlot: // Leave Slot
		return parseCommandLeaveSlot(cb.client, command)
	case commandStrPlay: // Make a move
		return parseCommandPlay(cb.client, command)
	case commandStrChat: // Chat
		return parseCommandChat(cb.client, command)
	case commandStrState: // Room State
		return parseCommandState(cb.client, command)
	default: // Unknown Command
		// Format: ????
		// Sends: [ERRO:ERRO:Socket Format Error]
		return commandError(commandStrError, "Socket Format Error")
	}
}

func parseCommandMakeRoom(client *webClient, command []string) (string, []string) {
	// Format: [MKRM]
	// Sends:
	// on success: [MKRM:<new room id>]
	// on failure: [ERRO:MKRM:<error_msg>]
	if len(command) != 1 {
		return malformedCommand(commandStrMakeRoom)
	}

	roomID, err := client.hub.createRoom(client)
	if err != nil {
		return commandError(commandStrMakeRoom, err.Error())
	}
	return commandStrMakeRoom, []string{strconv.Itoa(roomID)}
}

func parseCommandJoinRoom(client *webClient, command []string) (string, []string) {
	// Format: [JOIN:<room_id>]
	// Sends:
	// on success: [JOIN:<room_id>]
	// on failure: [ERRO:JOIN:<error_msg>]
	if len(command) != 2 {
		return malformedCommand(commandStrJoinRoom)
	}

	roomID, err := parseRoomID(command[1])
	if err != nil {
		return commandError(commandStrJoinRoom, err.Error())
	}

	if err = client.joinRoom(roomID); err != nil {
		return commandError(commandStrJoinRoom, err.Error())
	}

	return commandStrJoinRoom, []string{strconv.Itoa(roomID)}
}

func parseCommandJoinSlot(client *webClient, command []string) (string, []string) {
	// Format: [JNSL:<room_id>]
	// Sends:
	// on success: [JNSL:<room_id>:<slotid>]
	// on failure: [ERRO:JNSL:<error_msg>]
	if len(command) != 2 {
		return malformedCommand(commandStrJoinSlot)
	}

	roomID, err := parseRoomID(command[1])
	if err != nil {
		return commandError(commandStrJoinSlot, err.Error())
	}

	slotID := -1
	err = nil
	if _, ok := client.hub.rooms[roomID]; ok {
		slotID, err = client.hub.rooms[roomID].joinSlot(client)
		if err != nil {
			return commandError(commandStrJoinSlot, err.Error())
		}
	} else {
		return commandError(commandStrJoinSlot, "Failed to join slot: Room does not exist")
	}

	return commandStrJoinSlot, []string{strconv.Itoa(roomID), strconv.Itoa(slotID)}
}

func parseCommandLeaveRoom(client *webClient, command []string) (string, []string) {
	// Format: [LEAV:<room_id>]
	// Sends:
	// on success: [LEAV:<room_id>]
	// on failure: [ERRO:LEAV:<error_msg>]
	if len(command) != 2 {
		return malformedCommand(commandStrLeaveRoom)
	}

	roomID, roomIDErr := parseRoomID(command[1])
	if roomIDErr != nil {
		return commandError(commandStrLeaveRoom, roomIDErr.Error())
	}

	if _, ok := client.hub.rooms[roomID]; ok {
		if err := client.hub.rooms[roomID].leave(client); err != nil {
			return commandError(commandStrLeaveRoom, err.Error())
		}
	} else {
		return commandError(commandStrLeaveRoom, "Failed to leave room: Does not exist")
	}

	return commandStrLeaveRoom, []string{strconv.Itoa(roomID)}
}

func parseCommandLeaveSlot(client *webClient, command []string) (string, []string) {
	// Format: [LVSL:<room_id>]
	// Sends:
	// on success: [LVSL:<room_id>]
	// on failure: [ERRO:LVSL:<error_msg>]
	if len(command) != 2 {
		return malformedCommand(commandStrLeaveSlot)
	}

	roomID, roomIDErr := parseRoomID(command[1])
	if roomIDErr != nil {
		return commandError(commandStrLeaveSlot, roomIDErr.Error())
	}

	if _, ok := client.hub.rooms[roomID]; ok {
		if err := client.hub.rooms[roomID].leaveSlot(client); err != nil {
			return commandError(commandStrLeaveSlot, err.Error())
		}
	} else {
		return commandError(commandStrLeaveSlot, "Failed to leave slot: Room does not exist")
	}

	return commandStrLeaveSlot, []string{strconv.Itoa(roomID)}
}

func parseCommandPlay(client *webClient, command []string) (string, []string) {
	// Format: [PLAY:<room_id>:<token>:<board_x>,<board_y>:<square_x>,<square_y>]
	// Alternatively, for variable size boards:
	// [PLAY:<room_id>:<token>:<board1_x>,<board1_y>:...<boardn_x>,<boardn_y>:<square_x>,<square_y>]
	// Sends:
	// on success: [PLAY:<room_id>:<board_x>,<board_y>:<square_x>,<square_y>] to all clients in room
	// on failure [ERRO:PLAY:<error_msg>]
	if len(command) != 4 {
		return malformedCommand(commandStrPlay)
	}

	roomID, roomIDErr := parseRoomID(command[1])
	if roomIDErr != nil {
		return commandError(commandStrPlay, roomIDErr.Error())
	}

	var squares [][2]int
	for i := 2; i < len(command); i++ {
		cell := strings.Split(command[i], ",")

		if len(cell) != 2 {
			return malformedCommand(commandStrPlay)
		}

		x, err := strconv.Atoi(cell[0])
		if err != nil {
			return commandError(commandStrPlay, err.Error())
		}
		y, err := strconv.Atoi(cell[1])
		if err != nil {
			return commandError(commandStrPlay, err.Error())
		}

		squares = append(squares, [2]int{x, y})
	}

	var token string
	r, ok := client.hub.rooms[roomID]
	if ok {
		if r.players[0] == client {
			token = "X"
		} else if r.players[1] == client {
			token = "O"
		} else {
			return commandError(commandStrPlay, "Member is not in a slot")
		}

		if err := r.board.play(token,
			squares[0][0],
			squares[0][1],
			squares[1][0],
			squares[1][1]); err != nil {
			return commandError(commandStrPlay, err.Error())
		}
	} else {
		return commandError(commandStrPlay, "Failed to play: room does not exist")
	}

	var args []string
	args = append(args, strconv.Itoa(roomID))
	args = append(args, token)
	for _, s := range squares {
		pair := fmt.Sprint(strconv.Itoa(s[0]), ",", strconv.Itoa(s[1]))
		args = append(args, pair)
	}

	//send to other room members
	for m := range r.members {
		if m != client {
			m.sendToClient(commandStrPlay, args)
		}
	}

	//reply to client
	return commandStrPlay, args
}

func parseCommandChat(client *webClient, command []string) (string, []string) {
	// Format: [CHAT:<room_id>:<message>]
	// Sends:
	// on success: [CHAT:<timestamp>:<username>:<message>] to all clients in room
	// on failure: [ERRO:CHAT:<error_msg>]
	if len(command) != 3 {
		return malformedCommand(commandStrChat)
	}

	roomID, roomIDErr := parseRoomID(command[1])
	if roomIDErr != nil {
		return commandError(commandStrChat, roomIDErr.Error())
	}

	// Epoch timestamp in milliseconds
	timestamp := strconv.FormatInt(time.Now().UnixNano()/1000000, 10)
	if err := client.sendChatMessage(roomID, timestamp, command[2]); err != nil {
		return commandError(commandStrChat, err.Error())
	}
	return commandStrChat, []string{timestamp, client.name, command[2]}
}

func parseCommandState(client *webClient, command []string) (string, []string) {
	// Format: [STAT:<room_id>]
	// Sends:
	// on success: [STAT:<room_state_json>]
	// on failure: [ERRO:STAT:<error_msg>]
	if len(command) != 2 {
		return malformedCommand(commandStrState)
	}

	return commandError(commandStrState, "Not Implemented")
}

func malformedCommand(command string) (string, []string) {
	err := fmt.Sprintf("%s command malformed", command)
	return commandError(command, err)
}

func commandError(command, message string) (string, []string) {
	log.Printf("%s: %s\n", command, message)
	return commandStrError, []string{command, message}
}

func parseRoomID(roomIDStr string) (int, error) {
	roomID, roomIDErr := strconv.Atoi(roomIDStr)
	if roomIDErr != nil {
		return -1, roomIDErr
	}
	if roomID <= 0 {
		return -1, errors.New("Invalid room ID")
	}

	return roomID, nil
}

func (h *webHub) createRoom(client *webClient) (int, error) {
	if h == nil || client == nil {
		return 0, errors.New("Internal error in create room")
	}
	if _, ok := h.rooms[h.roomCount+1]; ok {
		return 0, errors.New("Room already exists")
	}
	if len(client.rooms) > clientMaxRooms {
		return 0, errors.New("Connected to too many rooms")
	}
	h.roomCount++
	h.rooms[h.roomCount] = &room{h.roomCount, map[*webClient]struct{}{}, &ticTacMetaBoard{},
		[2]*webClient{nil, nil}}
	client.joinRoom(h.roomCount)
	return h.roomCount, nil
}
