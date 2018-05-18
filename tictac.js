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
}

class TTTBoard {
    constructor(x, y, width, height, padding=0, rows=3, cols=3) {
        this.box = new Box(x, y, width, height, padding);

        this.subGrid = Array(rows);
        for (let i = 0; i < rows; i++) {
            this.subGrid[i] = Array(cols);
            for (let j = 0; j < cols; j++) {
                this.subGrid[i][j] = new Box(
                    x + (width*j / cols),
                    y + (height*i / rows),
                    width / cols,
                    height / rows
                );
            }
        }

        this.state = Array(rows);
        for (let i = 0; i < rows; i++) {
            this.state[i] = Array(cols);
            for (let j = 0; j < cols; j++) {
                this.state[i][j] = "";
            }
        }
    }

    draw(ctx, lineWidth=1) {
        let x = this.box.x, y = this.box.y, width = this.box.width, height = this.box.height;
        let oldLineWidth = ctx.lineWidth; ctx.lineWidth = lineWidth;
        x += this.box.padding; y +=this.box.padding; 
        height -= this.box.padding*2; width -= this.box.padding*2;
        drawLine(ctx, x + (width / 3), y, x + (width / 3), y + height);
        drawLine(ctx, x + (width*2 / 3), y, x + (width*2 / 3), y + height);
        drawLine(ctx, x, y + (height / 3), x + width, y + (height / 3));
        drawLine(ctx, x, y + (height*2 / 3), x + width, y + (height*2 / 3));
        ctx.lineWidth = oldLineWidth;
    }

    getCell(x, y) {
        if (!this.box.containsPoint(x, y)) {
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

document.addEventListener("DOMContentLoaded", function(event) {
    let c = document.getElementById("main");
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    let ctx = c.getContext("2d");
    const padding = 20;

    let tttMeta = new TTTBoard(0, 0, c.width, c.height, padding);
    let tttGrid = Array(tttMeta.subGrid.length);
    for (let i = 0; i < tttMeta.subGrid.length; i++) {
        tttGrid[i] = Array(tttMeta.subGrid[i].length);
        for (let j = 0; j < tttMeta.subGrid[i].length; j++) {
            let box = tttMeta.subGrid[i][j];
            tttGrid[i][j] = new TTTBoard(box.x, box.y, box.width, box.height, padding);
        }
    }

    renderTTT(ctx, tttMeta, tttGrid);

    let xo = true;
    c.addEventListener('click', function(event) {
        let count = 0;
        tttGrid.forEach(row => {
            row.forEach(value => {
                count++;
                let cell = value.getCell(event.pageX, event.pageY);
                if (cell != null) {
                    let [col, row] = cell;
                    let [x, y] = value.subGrid[col][row].center();
                    ctx.strokeText(xo ? "X" : "O", x, y);
                    xo = !xo;
                }
            });
        });
    });
});

function drawLine(ctx, start_x, start_y, end_x, end_y) {
    ctx.beginPath();
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
}

function renderTTT(ctx, tttMeta, tttGrid) {
    tttMeta.draw(ctx, 5);

    ctx.strokeStyle = "slategrey";

    tttGrid.forEach(row => {
        row.forEach(value => {
            value.draw(ctx);
        });
    });

    ctx.strokeStyle = "black";
}