export class TTTCanvas {
    constructor(canvas, tttBoard) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.board = tttBoard;
    }

    renderTTT() {
        this.canvas.width = this.canvas.height = this.canvas.parentElement.clientWidth < this.canvas.parentElement.clientHeight ?
            this.canvas.parentElement.clientWidth : this.canvas.parentElement.clientHeight;
        this.board.resize(this.canvas.width, this.canvas.height);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.board.draw(this.ctx, ["black", "slategrey"], [5, 1]);
    }
}