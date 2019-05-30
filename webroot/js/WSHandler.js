import { TTTCanvas } from "./TTTCanvas.js";

const kCommandDelimeter = String.fromCharCode(0x1E);

const kCommandStrMakeRoom  = "MKRM";
const kCommandStrJoinRoom  = "JOIN";
const kCommandStrJoinSlot  = "JNSL";
const kCommandStrLeaveRoom = "LEAV";
const kCommandStrLeaveSlot = "LVSL";
const kCommandStrPlay      = "PLAY";
const kCommandStrChat      = "CHAT";
const kCommandStrError     = "ERRO";

const kSystemUserName = "[System]";

const kHelpText = "\n/make\tCreate a Room | "
+ "/join <roomid>\tJoin an existing Room | "
+ "/leave\tLeave the current room | " 
+ "/sit\tTake a slot in the current room";

export class WsHandler {
    /**
     * @constructor
     * @param {TTTCanvas} tttCanvas The TTTCanvas to use for drawing/plays
     * @param {Function} chatHandler A function that accepts 2 parameters for `username` 
     * and `message` to handle output to the client.
     */
    constructor(tttCanvas, chatHandler){
        this.roomID = -1;
        this.ws = new WebSocket("ws://" + location.hostname + (location.port ? ":" + location.port : "") + "/ws");
        this.chatHandler = chatHandler;

        this.ws.addEventListener("open", event => { 
            console.log("open");
            this.chatHandler(kSystemUserName, "Connected");
        });

        this.ws.addEventListener("close", event => { 
            console.log("close"); 
            this.chatHandler(kSystemUserName, "Lost connection");
        });

        this.ws.addEventListener("message", event => { 
            console.log(event.data);
            let command = event.data.split(kCommandDelimeter);
            switch(command[0]) {
                case kCommandStrMakeRoom:
                    if (command.length === 2) {
                        this.roomID = command[1];
                        this.chatHandler(kSystemUserName, "Joined room " + command[1]);
                    }
                break;

                case kCommandStrJoinRoom:
                    if (command.length === 2) {
                        this.roomID = command[1];
                        this.chatHandler(kSystemUserName, "Joined room " + command[1]);
                    }
                break;

                case kCommandStrJoinSlot:
                    if (command.length === 3) {
                        this.chatHandler(kSystemUserName, "Joined slot " + command[2] + " in room " + command[1]);
                    }
                break;

                case kCommandStrLeaveRoom:
                    if (command.length === 2) {
                        this.chatHandler(kSystemUserName, "Left room " + this.roomID);
                        this.roomID = 0;
                    }
                break;

                case kCommandStrLeaveSlot:
                    if (command.length === 2) {
                        this.chatHandler(kSystemUserName, "Left your slot in room " + command[1]);
                    }
                break;

                case kCommandStrChat:
                    if (command.length === 4) {
                        this.chatHandler(command[2], command[3]);
                    }
                break;

                case kCommandStrError:
                    if (command.length === 3) {
                        this.chatHandler(kSystemUserName, command[2]);
                    } else {
                        this.chatHandler(kSystemUserName, "Unknown error occured");
                    }
                break;

                case kCommandStrPlay:
                    if (command.length > 2 && command.length % 2 === 1) {
                        let playPath = Array();
                        for (let i = 3; i < command.length; i++) {
                            let coord = command[i].split(",", 2);
                            playPath.push(coord);
                        }
                        tttCanvas.board.play(playPath, command[2]);
                        tttCanvas.renderTTT()
                    }
                break;
            }
        });

        this.ws.addEventListener("error", event => { console.log(event); });
    }

    sendToServer(command, ...params) {
        let str = command;
        params.forEach(p => { str += kCommandDelimeter + p });
        this.ws.send(str);
    }

    sendChatMessage(message) {
        if (message.substr(0, 1) === "/") {
            let command = message.slice(1).split(" ");
            switch (command[0]) {
                case "make":
                    this.sendToServer(kCommandStrMakeRoom);
                break;

                case "join":
                    if (command.length === 2) {
                        this.sendToServer(kCommandStrJoinRoom, command[1]);
                    }
                break;

                case "sit":
                case "slot":
                    if (command.length === 1) {
                        this.sendToServer(kCommandStrJoinSlot, this.roomID);
                    }
                break;

                case "stand":
                case "unslot":
                    this.sendToServer(kCommandStrLeaveSlot, this.roomID);
                break;

                case "leave":
                    this.sendToServer(kCommandStrLeaveRoom, this.roomID);
                break;

                case "help":
                    this.chatHandler(kSystemUserName, kHelpText);
                break;

                default:
                this.chatHandler(kSystemUserName, "Invalid / Command. Type /help for help.");
                break;
            }
        } else {
            if (this.roomID > -1) {
                this.sendToServer(kCommandStrChat, this.roomID, message);
            } else {
                this.chatHandler(kSystemUserName, "You aren't in a room");
            }
        }
    }

    sendPlay(cell) {
        if (this.roomID > -1) {
            this.sendToServer(kCommandStrPlay, this.roomID, ...cell.map(v => v.join()));
        }
    }
}