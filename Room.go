package main

import (
	"errors"
)

type room struct {
	members map[*webClient]struct{}
	ticTac  *ticTacMetaBoard
	players [2]*webClient
}

func (r *room) join(client *webClient) error {
	if _, ok := r.members[client]; ok {
		return errors.New("Member already in room")
	}

	r.members[client] = struct{}{}

	return nil
}

func (r *room) leave(client *webClient) error {
	if _, ok := r.members[client]; !ok {
		return errors.New("Member not in room")
	}

	delete(r.members, client)
	return nil
}

func (r *room) joinSlot(client *webClient, slotID int) error {
	if _, ok := r.members[client]; !ok {
		return errors.New("Member not in room")
	}

	if slotID < 0 || slotID > 2 {
		return errors.New("Invalid slotID")
	}

	if r.players[slotID] != nil {
		return errors.New("Slot is not empty")
	}

	for _, p := range r.players {
		if p == client {
			return errors.New("User is already in a slot")
		}
	}

	r.players[slotID] = client

	return nil
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
