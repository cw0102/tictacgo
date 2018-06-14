import { Box } from "./Box.js"
import { drawLine } from "./util.js"

export class TTTBoard extends Box {
    /**
     * @constructor
     * @param {number} x The Left coordinate to begin the grid
     * @param {number} y The Top coordinate to begin the grid
     * @param {number} width The width of the grid
     * @param {number} height The height of the grid
     * @param {number} sublevels The depth of subgrids for this board.
     * This will create a new board in each row/col space recursively
     * `subgrid` times.
     * @param {number} padTop The amount of padding on the top side of the grid.
     * @param {number} padBot The amount of padding on the bottom side of the grid.
     * @param {number} padLeft The amount of padding on the left side of the grid.
     * @param {number} padRight The amount of padding on the right side of the grid.
     * @param {number} rows The number of rows in this and all child grids.
     * @param {number} cols The number of columns in this and all child grids.
     * @param {number} level Internal use to track how deep this grid is in the tree.
     */
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

    /**
     * Resizes the board to a new `width` and `height`.
     * @param {number} width The new width
     * @param {number} height The new height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.resizeSubGrid();
    }

    /**
     * Resizes the child elements of this TTTBoard to
     * fit the current width and height of this object.
     * @private
     */
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

    /**
     * Draw the TTTBoard on the given canvas `ctx`.
     * @param {CanvasRenderingContext2D} ctx The rendering context to use
     * @param {Array<string>} lineColors An array of colors, one for each sublevel
     * @param {Array<number>} lineWidths An array of widths to use for lines, one 
     * for each sublevel.
     */
    draw(ctx, lineColors, lineWidths) {
        // Preserve the old strokeStyle and lineWidth, then
        // set them by pulling from the array.
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
                    this.subGrid[i][j].draw(ctx, 
                        lineColors.length > 1 ? lineColors.slice(1) : lineColors, 
                        lineWidths.length > 1 ? lineWidths.slice(1) : lineWidths);
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

        // Restore the old strokeStyle and lineWidth
        ctx.strokeStyle = oldStrokeStyle;
        ctx.lineWidth = oldLineWidth;
    }

    /**
     * If this board contains (`x`, `y`), return the given board
     * path to the lowest sublevel board containing this point.
     * Returns null if this board does not contain (`x`, `y`).
     * @param {number} x X coordinate
     * @param {number} y Y coordiante
     */
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

    /**
     * Plays `token` in the box described by `path`.
     * @param {Array<Array<number>>} path The sublevel path to the box to play
     * @param {string} token The token to play in the box
     */
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

    /**
     * Draws debug boxes around the lowest sublevel Boxes,
     * optionally with `padding`.
     * For debug purposes.
     * @param {CanvasRenderingContext2D} ctx The rendering context to use
     * @param {boolean} padding Draw the bounding box with or without padding
     */
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