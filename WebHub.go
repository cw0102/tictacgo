package main

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"gochat/util"
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

const clientMaxRooms = 50

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
	log.Printf("Sent: [%s:%s]\n", cmd, strings.Join(params, ":"))
	cb.client.sendToClient(cmd, params)
}

func getCommandResponse(cb commandBinding) (string, []string) {
	command := util.SplitWithEscape(string(cb.data), ':', '\\', true)

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
		// Sends: [ERRO:Socket Format Error]
		return commandStrError, []string{"Socket Format Error"}
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
		return commandStrError, []string{commandStrMakeRoom, err.Error()}
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
	roomID, err := strconv.Atoi(command[1])
	if err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrJoinRoom, err.Error()}
	}
	if roomID == 0 {
		err := "Invalid room ID"
		log.Println(err)
		return commandStrError, []string{commandStrJoinSlot, err}
	}
	if err = client.joinRoom(roomID); err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrJoinRoom, err.Error()}
	}
	return commandStrJoinRoom, []string{strconv.Itoa(roomID)}
}

func parseCommandJoinSlot(client *webClient, command []string) (string, []string) {
	// Format: [JNSL:<room_id>:<slotid>]
	// Sends:
	// on success: [JNSL:<room_id>:<slotid>]
	// on failure: [ERRO:JNSL:<error_msg>]
	if len(command) != 3 {
		return malformedCommand(commandStrJoinSlot)
	}
	roomID, err := strconv.Atoi(command[1])
	if err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrJoinSlot, err.Error()}
	}
	if roomID == 0 {
		err := "Invalid room ID"
		log.Println(err)
		return commandStrError, []string{commandStrJoinSlot, err}
	}
	slotID, err := strconv.Atoi(command[2])
	if err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrJoinSlot, err.Error()}
	}
	if err := client.joinRoomSlot(roomID, slotID); err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrJoinSlot, err.Error()}
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
	roomID, roomIDErr := strconv.Atoi(command[1])
	if roomIDErr != nil {
		log.Println(roomIDErr)
		return commandStrError, []string{commandStrLeaveRoom, roomIDErr.Error()}
	}
	if roomID == 0 {
		err := "Invalid room ID"
		log.Println(err)
		return commandStrError, []string{commandStrLeaveRoom, err}
	}
	if err := client.leaveRoom(roomID); err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrLeaveRoom, err.Error()}
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
	roomID, roomIDErr := strconv.Atoi(command[1])
	if roomIDErr != nil {
		log.Println(roomIDErr)
		return commandStrError, []string{commandStrLeaveSlot, roomIDErr.Error()}
	}
	if roomID == 0 {
		err := "Invalid room ID"
		log.Println(err)
		return commandStrError, []string{commandStrLeaveSlot, err}
	}
	if err := client.leaveRoomSlot(roomID); err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrLeaveSlot, err.Error()}
	}
	return commandStrLeaveSlot, []string{strconv.Itoa(roomID)}
}

func parseCommandPlay(client *webClient, command []string) (string, []string) {
	// Format: [PLAY:<room_id>:<boardid>:<squareid>]
	// Sends:
	// on success: [PLAY:<room_id>:<boardid>:<squareid>] to all clients in room
	// on failure [ERRO:PLAY:<error_msg>]
	if len(command) != 4 {
		return malformedCommand(commandStrPlay)
	}
	return commandStrPlay, []string{"0", "0", "0"}
}

func parseCommandChat(client *webClient, command []string) (string, []string) {
	// Format: [CHAT:<room_id>:<message>]
	// Sends:
	// on success: [CHAT:<timestamp>:<username>:<message>] to all clients in room
	// on failure: [ERRO:CHAT:<error_msg>]
	if len(command) != 3 {
		return malformedCommand(commandStrChat)
	}
	roomID, roomIDErr := strconv.Atoi(command[1])
	if roomIDErr != nil {
		log.Println(roomIDErr)
		return commandStrError, []string{commandStrChat, roomIDErr.Error()}
	}
	if roomID == 0 {
		err := "Invalid room ID"
		log.Println(err)
		return commandStrError, []string{commandStrChat, err}
	}
	timestamp := strconv.FormatInt(time.Now().UnixNano()/1000000, 10) // Epoch timestamp in milliseconds
	if err := client.sendChatMessage(roomID, timestamp, command[2]); err != nil {
		log.Println(err)
		return commandStrError, []string{commandStrChat, err.Error()}
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
	return commandStrState, []string{}
}

func malformedCommand(command string) (string, []string) {
	err := fmt.Sprintf("%s command malformed", command)
	log.Println(err)
	return commandStrError, []string{command, err}
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
	h.rooms[h.roomCount] = &room{h.roomCount, map[*webClient]struct{}{}, &ticTacMetaBoard{}, [2]*webClient{nil, nil}}
	client.joinRoom(h.roomCount)
	return h.roomCount, nil
}
