package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
)

var addr = flag.String("addr", ":8080", "http service address")

func serveHome(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if strings.HasSuffix(r.URL.Path, ".js") {
		w.Header()["Content-Type"] = []string{"text/javascript"}
		
		http.ServeFile(w, r, fmt.Sprintf("webroot/js/%s", r.URL.Path))
		return
	}

	if r.URL.Path == "/main.css" {
		w.Header()["Content-Type"] = []string{"text/css"}

		http.ServeFile(w, r, "webroot/main.css")
		return
	}

	if r.URL.Path == "/" {
		http.ServeFile(w, r, "webroot/main.html")
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
}

func main() {
	flag.Parse()
	hub := newWebHub()
	go hub.run()
	http.HandleFunc("/", serveHome)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
