"use strict";

class Box {
    constructor(x, y, width, height, padTop=0, padBot=0, padLeft=0, padRight=0){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.padTop = padTop;
        this.padBot = padBot;
        this.padLeft = padLeft;
        this.padRight = padRight;
    }

    containsPoint(x, y) {
        if (x > this.x + this.padLeft
            && x < this.x + this.width - this.padRight
            && y > this.y + this.padTop
            && y < this.y + this.height - this.padBot
        ) {
            return true;
        }

        return false;
    }

    center() {
        return [this.x + (this.width / 2), this.y + (this.height / 2)];
    }

    drawBorder(ctx, padding) {
        let oldStyle = ctx.strokeStyle;
        if (padding) {
            ctx.strokeStyle = "blue";
            ctx.strokeRect(this.x + this.padLeft, 
                this.y + this.padTop, 
                this.width - this.padLeft - this.padRight, 
                this.height - this.padBot - this.padTop);
        } else {
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.x, 
                this.y, 
                this.width, 
                this.height);
        }
        ctx.strokeStyle = oldStyle;
    }
}

class TTTBoard extends Box {
    constructor(x, y, width, height, sublevels, padTop=0, padBot=0, padLeft=0, padRight=0, rows=3, cols=3, level=1) {
        super(x, y, width, height, padTop, padBot, padLeft, padRight);
        this.rows = rows;
        this.cols = cols;
        this.sublevels = sublevels;
        this.level = level;

        this.subGrid = Array(rows);
        for (let i = 0; i < rows; i++) {
            this.subGrid[i] = Array(cols);
            for (let j = 0; j < cols; j++) {
                if (this.sublevels > 0) {
                    this.subGrid[i][j] = new TTTBoard(0, 0, 0, 0, 
                        this.sublevels - 1,
                        i == 0 ? this.padTop * level : this.padTop,
                        i == rows - 1 ? this.padBot * level : this.padBot,
                        j == 0 ? this.padLeft * level : this.padLeft,
                        j == cols - 1 ? this.padRight * level : this.padRight,  
                        this.rows, 
                        this.cols,
                        this.level + 1);
                } else {
                    this.subGrid[i][j] = new Box(0, 0, 0, 0, 
                        i == 0 ? this.padTop * level : this.padTop,
                        i == rows - 1 ? this.padBot * level : this.padBot,
                        j == 0 ? this.padLeft * level : this.padLeft,
                        j == cols - 1 ? this.padRight * level : this.padRight);
                }
            }
        }

        this.resizeSubGrid();

        this.state = Array(rows);
        for (let i = 0; i < rows; i++) {
            this.state[i] = Array(cols);
            for (let j = 0; j < cols; j++) {
                this.state[i][j] = "";
            }
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.resizeSubGrid();
    }

    resizeSubGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                let grid = this.subGrid[row][col];
                grid.x = this.x + (this.width * col / this.cols);
                grid.y = this.y + (this.height * row / this.rows);
                grid.width = this.width / this.cols;
                grid.height = this.height / this.rows;
                if (this.sublevels > 0) {
                    grid.resizeSubGrid();
                }
            }
        }
    }

    draw(ctx, lineColors, lineWidths) {
        let oldStrokeStyle = ctx.strokeStyle;
        ctx.strokeStyle = lineColors[0];
        let oldLineWidth = ctx.lineWidth; 
        ctx.lineWidth = lineWidths[0];

        let x = this.x, 
            y = this.y, 
            width = this.width, 
            height = this.height;

        x += this.padLeft; y +=this.padTop; 
        height -= (this.padBot + this.padTop); width -= (this.padLeft + this.padRight);
        drawLine(ctx, x + (width / 3), y, x + (width / 3), y + height);
        drawLine(ctx, x + (width*2 / 3), y, x + (width*2 / 3), y + height);
        drawLine(ctx, x, y + (height / 3), x + width, y + (height / 3));
        drawLine(ctx, x, y + (height*2 / 3), x + width, y + (height*2 / 3));

        if (this.sublevels > 0) {
            for (let i = 0; i < this.subGrid.length; i++) {
                for (let j = 0; j < this.subGrid[i].length; j++) {
                    this.subGrid[i][j].draw(ctx, lineColors.slice(1), lineWidths.slice(1));
                }
            }
        } else {
            ctx.strokeStyle = "black";
            for (let i = 0; i < this.subGrid.length && i < this.state.length; i++) {
                for (let j = 0; j < this.subGrid[i].length && j < this.state[j].length; j++) {
                    let [x, y] = this.subGrid[i][j].center();
                    ctx.textAlign = "center";
                    ctx.strokeText(this.state[i][j], x, y);
                }
            }
        }

        ctx.strokeStyle = oldStrokeStyle;
        ctx.lineWidth = oldLineWidth;
    }

    getCell(x, y) {
        if (!this.containsPoint(x, y)) {
            return null;
        }

        let path = Array();
        for (let i = 0; i < this.subGrid.length; i++) {
            for (let j = 0; j < this.subGrid[i].length; j++) {
                if (this.subGrid[i][j].containsPoint(x,y)) {
                    path.push([i, j]);
                    if (this.sublevels > 0) {
                        let cell = this.subGrid[i][j].getCell(x, y);
                        if (cell != null) {
                            path = path.concat(cell);
                        } else {
                            return null; // landed in padding of subgrid
                        }
                    }
                }
            }
        }
        
        if (path.length > 0) {
            return path;
        } else {
            return null;
        } 
    }

    play(path, token) {
        if (this.sublevels > path.length)
        {
            return;
        }
        let [row, col] = path[0];
        if (this.sublevels > 0) {
            this.subGrid[row][col].play(path.slice(1), token);
        } else {
            this.state[row][col] = token;
        }
    }

    drawDebugBorders(ctx, padding) {
        if (this.sublevels > 0) {
            this.subGrid.forEach(e => {
                e.forEach(f => {
                    f.drawDebugBorders(ctx, padding);
                });
            });
        } else {
            this.subGrid.forEach(e => {
                e.forEach(f => {
                    f.drawBorder(ctx, padding);
                });
            });
        }
    }
}

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

class WsHandler {
    constructor(ctx, tttBoard){ //passing these is a dirty hack for now
        this.roomID = -1;
        this.ws = new WebSocket("ws://" + location.hostname + (location.port ? ":" + location.port : "") + "/ws");

        this.ws.addEventListener("open", event => { 
            console.log("open");
            postToChatFrame(kSystemUserName, "Connected");
        });

        this.ws.addEventListener("close", event => { 
            console.log("close"); 
            postToChatFrame(kSystemUserName, "Lost connection");
        });

        this.ws.addEventListener("message", event => { 
            console.log(event.data);
            let command = event.data.split(kCommandDelimeter);
            switch(command[0]) {
                case kCommandStrMakeRoom:
                    if (command.length === 2) {
                        this.roomID = command[1];
                        postToChatFrame(kSystemUserName, "Joined room " + command[1]);
                    }
                break;

                case kCommandStrJoinRoom:
                    if (command.length === 2) {
                        this.roomID = command[1];
                        postToChatFrame(kSystemUserName, "Joined room " + command[1]);
                    }
                break;

                case kCommandStrJoinSlot:
                    if (command.length === 3) {
                        postToChatFrame(kSystemUserName, "Joined slot " + command[2] + " in room " + command[1]);
                    }
                break;

                case kCommandStrLeaveRoom:
                    if (command.length === 2) {
                        postToChatFrame(kSystemUserName, "Left room " + this.roomID);
                        this.roomID = 0;
                    }
                break;

                case kCommandStrLeaveSlot:
                    if (command.length === 2) {
                        postToChatFrame(kSystemUserName, "Left your slot in room " + command[1]);
                    }
                break;

                case kCommandStrChat:
                    if (command.length === 4) {
                        postToChatFrame(command[2], command[3]);
                    }
                break;

                case kCommandStrError:
                    if (command.length === 3) {
                        postToChatFrame(kSystemUserName, command[2]);
                    } else {
                        postToChatFrame(kSystemUserName, "Unknown error occured");
                    }
                break;

                case kCommandStrPlay:
                    if (command.length > 2 && command.length % 2 === 1) {
                        let playPath = Array();
                        for (let i = 3; i < command.length; i++) {
                            let coord = command[i].split(",", 2);
                            playPath.push(coord);
                        }
                        tttBoard.play(playPath, command[2]);
                        renderTTT(ctx, tttBoard); // ewww
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
                    postToChatFrame(kSystemUserName, kHelpText);
                break;

                default:
                    postToChatFrame(kSystemUserName, "Invalid / Command. Type /help for help.");
                break;
            }
        } else {
            if (this.roomID > -1) {
                this.sendToServer(kCommandStrChat, this.roomID, message);
            } else {
                postToChatFrame(kSystemUserName, "You aren't in a room");
            }
        }
    }
}

function drawLine(ctx, start_x, start_y, end_x, end_y) {
    ctx.beginPath();
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
}

function renderTTT(ctx, tttRoot) {
    let c = ctx.canvas;
    c.width = c.height = c.parentElement.clientWidth < c.parentElement.clientHeight ? c.parentElement.clientWidth : c.parentElement.clientHeight;
    tttRoot.resize(c.width, c.height);
    ctx.clearRect(0, 0, c.width, c.height);
    tttRoot.draw(ctx, ["black", "slategrey"], [5, 1]);
    //tttRoot.drawDebugBorders(ctx, true);
    //tttRoot.drawDebugBorders(ctx, false);
}

function postToChatFrame(user, msg) {
    let chatFrame = document.getElementById("chat-display");
    let newMessage = document.createElement("p");
    newMessage.setAttribute("class", "message");
    let newMessageUser = document.createElement("span");
    newMessageUser.setAttribute("class", "username");
    let newMessageUserText = document.createTextNode(user);
    newMessageUser.appendChild(newMessageUserText);
    newMessage.appendChild(newMessageUser);
    let newMessageText = document.createTextNode(": " + msg);
    newMessage.appendChild(newMessageText);
    chatFrame.appendChild(newMessage);
    chatFrame.scrollTop = chatFrame.scrollHeight;
}

function sanitizeText(s) {
    // Remove leading/trailing newlines
    s = s.replace(/^\n+/, "");
    s = s.replace(/\n+$/, "");
    // Remove excessive newlines
    s = s.replace(/\n\n+/g, "\n");
    return s;
}

document.addEventListener("DOMContentLoaded", function(event) {
    let c = document.getElementById("main");
    let ctx = c.getContext("2d");
    const padding = 5;

    let tttRoot = new TTTBoard(0, 0, c.width, c.height, 1, padding, padding, padding, padding);

    window.addEventListener("resize", () => {
        renderTTT(ctx, tttRoot);
    });

    renderTTT(ctx, tttRoot);

    let ws = new WsHandler(ctx, tttRoot);

    c.addEventListener("click", function(event) {
        let cell = tttRoot.getCell(event.pageX, event.pageY);
        if (cell != null && cell.length >= 1) {
            ws.sendToServer(kCommandStrPlay, ws.roomID, ...cell.map(v => v.join()));
        }
    });

    let chatEntry = document.getElementById("chat-entry");
    chatEntry.addEventListener("keypress", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            let textArea = event.currentTarget;
            let chatText = textArea.value;
            textArea.value = "";
            chatText = sanitizeText(chatText);
            ws.sendChatMessage(chatText);
        }
    });
});