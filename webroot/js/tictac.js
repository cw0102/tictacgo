"use strict";

import { sanitizeText } from "./util.js";
import { TTTBoard } from "./TTTBoard.js";
import { WsHandler } from "./WSHandler.js";
import { TTTCanvas } from "./TTTCanvas.js";

/**
 * Posts a message to the chat frame with the
 * given `user` and `msg`.
 * @param {string} user The username
 * @param {string} msg The message
 */
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

document.addEventListener("DOMContentLoaded", function(event) {
    const padding = 5;
    let canvas = document.getElementById("main");
    let tttRoot = new TTTBoard(0, 0, canvas.width, canvas.height, 1, padding, padding, padding, padding);

    let tttCanvas = new TTTCanvas(canvas, tttRoot);

    window.addEventListener("resize", () => {
        tttCanvas.renderTTT();
    });

    tttCanvas.renderTTT();

    let ws = new WsHandler(tttCanvas, postToChatFrame);

    canvas.addEventListener("click", function(event) {
        let cell = tttRoot.getCell(event.pageX, event.pageY);
        if (cell != null && cell.length >= 1) {
            ws.sendPlay(cell);
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