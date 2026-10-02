// Package httpapi adapts JSON requests to the calculator domain.
package httpapi

import (
	"net/http"
	"strings"
)

// NewHandler serves the API and optionally a built frontend directory.
func NewHandler(staticDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/calculate", calculate)
	mux.HandleFunc("/api/v1/evaluate", evaluate)
	mux.HandleFunc("/api/v1/health", health)
	mux.Handle("/", frontendHandler(staticDir))
	return mux
}

func health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use GET for this endpoint.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func frontendHandler(staticDir string) http.Handler {
	var files http.Handler
	if staticDir != "" {
		files = http.FileServer(http.Dir(staticDir))
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if files != nil && !strings.HasPrefix(r.URL.Path, "/api/") {
			files.ServeHTTP(w, r)
			return
		}
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Endpoint not found.")
	})
}
