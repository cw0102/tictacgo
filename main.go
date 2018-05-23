package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", ":8080", "http service address")

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.URL.Path != "/" && r.URL.Path != "/tictac.js" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.URL.Path == "/tictac.js" {
		http.ServeFile(w, r, "tictac.js")
		return
	}

	http.ServeFile(w, r, "main.html")
}

func main() {
	flag.Parse()
	hub := newWebHub()
	go hub.run()
	http.HandleFunc("/", serveHome)
	http.HandleFunc("/tictac.js", serveHome)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
