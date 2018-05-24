package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", ":8080", "http service address")

func serveHome(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.URL.Path == "/tictac.js" {
		http.ServeFile(w, r, "tictac.js")
		return
	}

	if r.URL.Path == "/main.css" {
		w.Header()["Content-Type"] = []string{"text/css"}

		http.ServeFile(w, r, "main.css")
		return
	}

	if r.URL.Path == "/" {
		http.ServeFile(w, r, "main.html")
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
}

func main() {
	flag.Parse()
	hub := newWebHub()
	go hub.run()
	http.HandleFunc("/", serveHome)
	http.HandleFunc("/tictac.js", serveHome)
	http.HandleFunc("/main.css", serveHome)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
