/**
 * An optionally-padded bounding Box in a canvas
 */
export class Box {
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