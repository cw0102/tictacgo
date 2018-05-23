class Box {
    constructor(x, y, width, height, padding=0){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.padding = padding;
    }

    containsPoint(x, y) {
        if (x > this.x + this.padding
            && x < this.x + this.width - this.padding
            && y > this.y + this.padding
            && y < this.y + this.height - this.padding) {
            return true;
        }

        return false;
    }

    center() {
        return [this.x + (this.width / 2), this.y + (this.height / 2)];
    }

    drawBorder(ctx) {
        let oldStyle = ctx.strokeStyle;
        ctx.strokeStyle = "blue";
        ctx.strokeRect(this.x + this.padding, 
            this.y + this.padding, 
            this.width - this.padding*2, 
            this.height - this.padding*2);
        ctx.strokeStyle = oldStyle;
    }
}

class TTTBoard extends Box {
    constructor(x, y, width, height, padding, sublevels, rows=3, cols=3) {
        super(x, y, width, height, padding);
        this.rows = rows;
        this.cols = cols;
        this.sublevels = sublevels;

        this.subGrid = Array(rows);
        for (let i = 0; i < rows; i++) {
            this.subGrid[i] = Array(cols);
            for (let j = 0; j < cols; j++) {
                if (this.sublevels > 0) {
                    this.subGrid[i][j] = new TTTBoard(0, 0, 0, 0, this.padding, this.sublevels-1, this.rows, this.cols);
                } else {
                    this.subGrid[i][j] = new Box(0, 0, 0, 0, this.padding);
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
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let grid = this.subGrid[i][j];
                grid.x = this.x + (this.width * j / this.cols);
                grid.y = this.y + (this.height * i / this.rows);
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


        x += this.padding; y +=this.padding; 
        height -= this.padding*2; width -= this.padding*2;
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
        for (let i = 0; i < this.subGrid.length; i++) {
            for (let j = 0; j < this.subGrid[i].length; j++) {
                if (this.subGrid[i][j].containsPoint(x, y)) {
                    return [i, j];
                }
            }
        }

        return null;
    }
}

const kCommandStrMakeRoom  = "MKRM";
const kCommandStrJoinRoom  = "JOIN";
const kCommandStrJoinSlot  = "JNSL";
const kCommandStrLeaveRoom = "LEAV";
const kCommandStrLeaveSlot = "LVSL";
const kCommandStrPlay      = "PLAY";
const kCommandStrChat      = "CHAT";
const kCommandStrError     = "ERRO";

class WsHandler {
    constructor(){
        let self = this;
        this.ws = new WebSocket("ws://" + location.hostname + (location.port ? ':' + location.port : '') + "/ws");

        this.ws.addEventListener('open', function(event) {
            console.log("open");
            self.sendToServer(kCommandStrMakeRoom);
        });

        this.ws.addEventListener("close", event => { console.log("close"); });

        this.ws.addEventListener('message', event => { 
            console.log(event.data);
            let command = event.data.split(":");
            switch(command[0]) {
                case kCommandStrMakeRoom:
                    self.sendToServer(kCommandStrChat, command[1], "test1234");
                break;
            }
        });

        this.ws.addEventListener("error", event => { console.log(event); });
    }

    sendToServer(command, ...params) {
        let str = command;
        params.forEach(_ => { str += ":" + _ });
        this.ws.send(str);
    }
}

document.addEventListener("DOMContentLoaded", function(event) {
    let c = document.getElementById("main");
    let ctx = c.getContext("2d");
    const padding = 20;

    let tttMeta = new TTTBoard(0, 0, c.width, c.height, padding, 1);

    window.addEventListener("resize", () => {
        renderTTT(ctx, tttMeta);
    });

    renderTTT(ctx, tttMeta);

    let xo = true;
    c.addEventListener('click', function(event) {
        let count = 0;
        tttMeta.subGrid.forEach(row => {
            row.forEach(value => {
                count++;
                let cell = value.getCell(event.pageX, event.pageY);
                if (cell != null) {
                    let [col, row] = cell;
                    value.state[col][row] = xo ? "X" : "O";
                    xo = !xo;
                    renderTTT(ctx, tttMeta, tttGrid);
                }
            });
        });
    });

    let ws = new WsHandler();
});

function drawLine(ctx, start_x, start_y, end_x, end_y) {
    ctx.beginPath();
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
}

function renderTTT(ctx, tttMeta) {
    let c = ctx.canvas;
    c.width = c.height = c.parentElement.clientWidth < c.parentElement.clientHeight ? c.parentElement.clientWidth : c.parentElement.clientHeight;
    tttMeta.resize(c.width, c.height);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    tttMeta.draw(ctx, ["black", "slategrey"], [5, 1]);
    //drawDebugBorders(ctx, tttGrid);
}

function drawDebugBorders(ctx, grid) {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            for (let k = 0; k < grid[i][j].subGrid.length; k++) {
                for (let l = 0; l < grid[i][j].subGrid[k].length; l++) {
                    grid[i][j].subGrid[k][l].drawBorder(ctx);
                }
            }
        }
    }
}