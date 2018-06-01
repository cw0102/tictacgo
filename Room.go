package main

import (
	"errors"
)

type room struct {
	id      int
	members map[*webClient]struct{}
	ticTac  *ticTacMetaBoard
	players [2]*webClient
}

func (r *room) join(client *webClient) error {
	if _, ok := r.members[client]; ok {
		return errors.New("Member already in room")
	}

	r.members[client] = struct{}{}
	client.rooms[r] = struct{}{}

	return nil
}

func (r *room) leave(client *webClient) error {
	if _, ok := r.members[client]; !ok {
		return errors.New("Member not in room")
	}

	delete(client.rooms, r)
	delete(r.members, client)
	return nil
}

func (r *room) joinSlot(client *webClient) (int, error) {
	if _, ok := r.members[client]; !ok {
		return -1, errors.New("Member not in room")
	}

	slotID := -1
	for i, p := range r.players {
		if p == client {
			return -1, errors.New("User is already in a slot")
		} else if p == nil && slotID < 0 {
			slotID = i
		}
	}

	if slotID < 0 {
		return -1, errors.New("No available slot")
	}

	r.players[slotID] = client

	return slotID, nil
}

func (r *room) leaveSlot(client *webClient) error {
	if _, ok := r.members[client]; !ok {
		return errors.New("Member not in room")
	}

	for i := range r.players {
		if r.players[i] == client {
			r.players[i] = nil
			return nil
		}
	}

	return errors.New("Member not in a slot")
}

func (r *room) sendChatMessage(client *webClient, timestamp string, message string) error {
	for member := range r.members {
		if member != client {
			member.sendToClient(commandStrChat, []string{timestamp, client.name, message})
		}
	}
	return nil
}
