// Package apperror provides structured application errors without HTTP dependencies.
package apperror

type Error struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Position int    `json:"position,omitempty"`
}

func (e *Error) Error() string { return e.Message }

func New(code, message string) *Error { return At(code, message, 0) }

// At uses a one-based Unicode character position; zero means no specific location.
func At(code, message string, position int) *Error {
	return &Error{Code: code, Message: message, Position: position}
}
