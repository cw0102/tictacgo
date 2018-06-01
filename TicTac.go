package main

import (
	"errors"
)

type ticTacBoard struct {
	squares [9]string
}

type ticTacMetaBoard struct {
	boards [9]ticTacBoard
}

func (t *ticTacMetaBoard) play(token string, board, square int) error {
	current := &t.boards[board].squares[square]
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
	var grid [9]string
	for i := range grid {
		grid[i] = t.boards[i].getWinner()
	}
	return checkWinner(grid)
}

func checkWinner(board [9]string) string {
	// Get board tokens
	tokens := make(map[string]struct{})
	for _, token := range board {
		if token == "" {
			continue
		}
		if _, ok := tokens[token]; !ok {
			tokens[token] = struct{}{}
		}
	}

	/*
		0 1 2
		3 4 5
		6 7 8
	*/
	for v := range tokens {
		switch {
		case board[0] == v && board[1] == v && board[2] == v:
			fallthrough
		case board[0] == v && board[3] == v && board[6] == v:
			fallthrough
		case board[0] == v && board[4] == v && board[8] == v:
			fallthrough
		case board[1] == v && board[4] == v && board[7] == v:
			fallthrough
		case board[2] == v && board[5] == v && board[8] == v:
			fallthrough
		case board[2] == v && board[4] == v && board[6] == v:
			fallthrough
		case board[3] == v && board[4] == v && board[5] == v:
			fallthrough
		case board[6] == v && board[7] == v && board[8] == v:
			return v
		}
	}

	return ""
}
