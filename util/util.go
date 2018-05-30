package util

import (
	"strings"
)

// SplitWithEscape splits a string on `delim`, while not splitting on `delim` prefixed with `escape`.
// If `keepEscape` is true, `escape` is not removed from the resulting string.
// A double `escape` prints one `escape` character, unless `keepEscape` is true.
func SplitWithEscape(s string, delim, escape rune, keepEscape bool) (out []string) {
	current := ""
	lastWasEsc := false
	for _, char := range s {
		if lastWasEsc {
			current += string(char)
			lastWasEsc = false
			continue
		}
		if char == delim {
			out = append(out, current)
			current = ""
		} else if char == escape {
			if keepEscape {
				current += string(char)
			}
			lastWasEsc = true
		} else {
			current += string(char)
		}
	}
	out = append(out, current)

	return
}

// EscapeString escapes all instances of `escapedChars` with `escape`.
// E.g. with s="Hello", escapedChars=['e','l'], escape='\' -> returns "H\e\l\lo"
func EscapeString(s string, escapedChars []rune, escape rune) string {
	escapeStr := string(escape)
	for _, r := range escapedChars {
		sr := string(r)
		s = strings.Replace(s, sr, escapeStr+sr, -1)
	}

	return s
}
