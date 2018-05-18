package main

import (
	"testing"
)

func Test_newWebHub(t *testing.T) {
	hub := newWebHub()
	if hub.clients == nil {
		t.Error("Clients is nil")
	}
	if len(hub.clients) > 0 {
		t.Error("Clients is not empty")
	}
	if hub.rooms == nil {
		t.Error("Rooms is nil")
	}
	if len(hub.rooms) > 0 {
		t.Error("Rooms is not empty")
	}
	if hub.roomCount > 0 {
		t.Error("Room count is not 0")
	}
	if hub.register == nil {
		t.Error("Register channel is nil")
	}
	if hub.unregister == nil {
		t.Error("Unregister channel is nil")
	}
	if hub.command == nil {
		t.Error("Command channel is nil")
	}
}
