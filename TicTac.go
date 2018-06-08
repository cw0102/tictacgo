package main

import (
	"errors"
)

const (
	boardSizeCols = 3
	boardSizeRows = 3
)

type ticTacBoard struct {
	squares [boardSizeRows][boardSizeCols]string
}

type ticTacMetaBoard struct {
	boards [boardSizeRows][boardSizeCols]ticTacBoard
}

func (t *ticTacMetaBoard) play(token string, boardX, boardY, squareX, squareY int) error {
	current := &t.boards[boardX][boardY].squares[squareX][squareY]
	if *current != "" {
		return errors.New("Space is not empty")
	}

	*current = token

	return nil
}

func (t *ticTacBoard) getWinner() string {
	if t == nil {
		return ""
	}
	return checkWinner(t.squares)
}

func (t *ticTacMetaBoard) getWinner() string {
	var grid [boardSizeRows][boardSizeCols]string
	for i, val := range grid {
		for j := range val {
			grid[i][j] = t.boards[i][j].getWinner()
		}
	}
	return checkWinner(grid)
}

func checkWinner(board [boardSizeRows][boardSizeCols]string) string {
	// Get board tokens
	tokens := make(map[string]struct{})
	for _, row := range board {
		for _, token := range row {
			if token == "" {
				continue
			}
			if _, ok := tokens[token]; !ok {
				tokens[token] = struct{}{}
			}
		}
	}

	/*
		0 1 2		(0,0) (0,1) (0,2)
		3 4 5		(1,0) (1,1) (1,2)
		6 7 8		(2,0) (2,1) (2,2)

		transform = sum of coords + (row length-1)*(0 indexed row)
		i.e. (2,0) -> (2+0) + (3-1)*(2) -> 2 + 2*2 -> 6
	*/
	for v := range tokens {
		switch {
		case board[0][0] == v && board[0][1] == v && board[0][2] == v:
			fallthrough
		case board[0][0] == v && board[1][0] == v && board[2][0] == v:
			fallthrough
		case board[0][0] == v && board[1][1] == v && board[2][2] == v:
			fallthrough
		case board[0][1] == v && board[1][1] == v && board[2][1] == v:
			fallthrough
		case board[0][2] == v && board[1][2] == v && board[2][2] == v:
			fallthrough
		case board[0][2] == v && board[1][1] == v && board[2][0] == v:
			fallthrough
		case board[1][0] == v && board[1][1] == v && board[1][2] == v:
			fallthrough
		case board[2][0] == v && board[2][1] == v && board[2][2] == v:
			return v
		}
	}

	return ""
}
