package httpapi

import (
	"encoding/json"
	"net/http"

	"sezzle-calculator/internal/apperror"
)

type errorDetail = apperror.Error

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, struct {
		Error errorDetail `json:"error"`
	}{errorDetail{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
