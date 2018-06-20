
/**
 * Draws a line from (`start_x`, `start_y`) to (`end_x`, `end_y`) using canvas
 * rendering context `ctx`.
 * 
 * @param {CanvasRenderingContext2D} ctx The rendering context to use
 * @param {number} start_x The starting x-coordinate
 * @param {number} start_y The starting y-coordinate
 * @param {number} end_x The ending x-coordinate
 * @param {number} end_y The ending y-coordinate
 */
export function drawLine(ctx, start_x, start_y, end_x, end_y) {
    ctx.beginPath();
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
}

/**
 * Creates a sane representation of a string by removing excess newlines, etc.
 * 
 * @param {string} s The text to sanitize
 * @return {string} The sanitized version of the string 
 */
export function sanitizeText(s) {
    // Remove leading/trailing newlines
    s = s.replace(/^\n+/, "");
    s = s.replace(/\n+$/, "");
    // Remove excessive newlines
    s = s.replace(/\n\n+/g, "\n");
    return s;
}

/**
 * Adds <p class="message"><span class="username">`user`</span>: `msg`</p>
 * to the specified chatFrame.
 * @param {Element} chatFrame The chatframe to append to
 * @param {string} user The username
 * @param {string} msg The message
 */
export function appendChatElement(chatFrame, user, msg) {
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