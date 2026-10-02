package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCalculateEndpoint(t *testing.T) {
	tests := []struct {
		name, body string
		want       float64
	}{
		{"add", `{"operation":"add","operands":[10,2]}`, 12},
		{"subtract", `{"operation":"subtract","operands":[10,2]}`, 8},
		{"multiply", `{"operation":"multiply","operands":[10,2]}`, 20},
		{"divide", `{"operation":"divide","operands":[10,2]}`, 5},
		{"power", `{"operation":"power","operands":[10,2]}`, 100},
		{"sqrt", `{"operation":"sqrt","operands":[81]}`, 9},
		{"percentage", `{"operation":"percentage","operands":[250,15]}`, 37.5},
		{"scientific notation", `{"operation":"add","operands":[1e2,-2.5]}`, 97.5},
		{"trailing whitespace", "{\"operation\":\"add\",\"operands\":[1,2]}\n ", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := performRequest(http.MethodPost, "/api/v1/calculate", tt.body, "application/json; charset=utf-8")
			if response.Code != http.StatusOK {
				t.Fatalf("status %d: %s", response.Code, response.Body)
			}
			var payload struct {
				Result float64 `json:"result"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatal(err)
			}
			if payload.Result != tt.want {
				t.Errorf("got %v, want %v", payload.Result, tt.want)
			}
			if response.Header().Get("Content-Type") != "application/json" || response.Header().Get("Cache-Control") != "no-store" {
				t.Error("expected JSON content type and no-store cache header")
			}
		})
	}
}

func TestAPIErrorResponses(t *testing.T) {
	tests := []struct {
		name, method, path, body, contentType string
		status                                int
		code                                  string
	}{
		{"wrong method", "GET", "/api/v1/calculate", "", "application/json", 405, "METHOD_NOT_ALLOWED"},
		{"missing content type", "POST", "/api/v1/calculate", `{}`, "", 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"wrong content type", "POST", "/api/v1/calculate", `{}`, "text/plain", 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"empty body", "POST", "/api/v1/calculate", "", "application/json", 400, "INVALID_JSON"},
		{"malformed JSON", "POST", "/api/v1/calculate", `{`, "application/json", 400, "INVALID_JSON"},
		{"unknown field", "POST", "/api/v1/calculate", `{"operation":"add","operands":[1,2],"typo":true}`, "application/json", 400, "INVALID_JSON"},
		{"trailing JSON", "POST", "/api/v1/calculate", `{"operation":"add","operands":[1,2]} {}`, "application/json", 400, "INVALID_JSON"},
		{"trailing junk", "POST", "/api/v1/calculate", `{"operation":"add","operands":[1,2]} nope`, "application/json", 400, "INVALID_JSON"},
		{"array body", "POST", "/api/v1/calculate", `[]`, "application/json", 400, "INVALID_JSON"},
		{"null body", "POST", "/api/v1/calculate", `null`, "application/json", 400, "INVALID_JSON"},
		{"string operand", "POST", "/api/v1/calculate", `{"operation":"add","operands":["1",2]}`, "application/json", 400, "INVALID_JSON"},
		{"null operand", "POST", "/api/v1/calculate", `{"operation":"add","operands":[null,2]}`, "application/json", 400, "INVALID_OPERANDS"},
		{"boolean operand", "POST", "/api/v1/calculate", `{"operation":"add","operands":[true,2]}`, "application/json", 400, "INVALID_JSON"},
		{"infinite JSON number", "POST", "/api/v1/calculate", `{"operation":"add","operands":[1e400,2]}`, "application/json", 400, "INVALID_JSON"},
		{"missing operation", "POST", "/api/v1/calculate", `{"operands":[1,2]}`, "application/json", 400, "UNKNOWN_OPERATION"},
		{"unsupported operation", "POST", "/api/v1/calculate", `{"operation":"modulo","operands":[1,2]}`, "application/json", 400, "UNKNOWN_OPERATION"},
		{"missing operands", "POST", "/api/v1/calculate", `{"operation":"add"}`, "application/json", 400, "INVALID_OPERANDS"},
		{"null operands", "POST", "/api/v1/calculate", `{"operation":"add","operands":null}`, "application/json", 400, "INVALID_OPERANDS"},
		{"extra operands", "POST", "/api/v1/calculate", `{"operation":"sqrt","operands":[1,2]}`, "application/json", 400, "INVALID_OPERANDS"},
		{"division by zero", "POST", "/api/v1/calculate", `{"operation":"divide","operands":[10,0]}`, "application/json", 422, "DIVISION_BY_ZERO"},
		{"negative sqrt", "POST", "/api/v1/calculate", `{"operation":"sqrt","operands":[-1]}`, "application/json", 422, "DOMAIN_ERROR"},
		{"overflow", "POST", "/api/v1/calculate", `{"operation":"power","operands":[10,1000]}`, "application/json", 422, "RESULT_OUT_OF_RANGE"},
		{"large body", "POST", "/api/v1/calculate", strings.Repeat(" ", maxBodyBytes+1), "application/json", 413, "REQUEST_TOO_LARGE"},
		{"large trailing whitespace", "POST", "/api/v1/calculate", `{"operation":"add","operands":[1,2]}` + strings.Repeat(" ", maxBodyBytes), "application/json", 413, "REQUEST_TOO_LARGE"},
		{"unknown API route", "GET", "/api/v1/missing", "", "", 404, "NOT_FOUND"},
		{"no frontend configured", "GET", "/", "", "", 404, "NOT_FOUND"},
		{"health wrong method", "POST", "/api/v1/health", "", "", 405, "METHOD_NOT_ALLOWED"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := performRequest(tt.method, tt.path, tt.body, tt.contentType)
			if response.Code != tt.status {
				t.Fatalf("got status %d, want %d: %s", response.Code, tt.status, response.Body)
			}
			var payload struct {
				Error errorDetail `json:"error"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatal(err)
			}
			if payload.Error.Code != tt.code || payload.Error.Message == "" {
				t.Errorf("unexpected error: %+v", payload.Error)
			}
			if tt.status == 405 && response.Header().Get("Allow") == "" {
				t.Error("405 must include Allow header")
			}
		})
	}
}

func TestHealth(t *testing.T) {
	response := performRequest(http.MethodGet, "/api/v1/health", "", "")
	if response.Code != 200 || strings.TrimSpace(response.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("unexpected health response: %d %s", response.Code, response.Body)
	}
}

func TestStaticFrontend(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<h1>Calculator</h1>"), 0600); err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(dir)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if response.Code != 200 || !strings.Contains(response.Body.String(), "Calculator") {
		t.Fatalf("frontend not served: %d %s", response.Code, response.Body)
	}
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/missing", nil))
	if response.Code != 404 || response.Header().Get("Content-Type") != "application/json" {
		t.Error("unknown API routes must return JSON even when serving the frontend")
	}
}

func performRequest(method, path, body, contentType string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		request.Header.Set("Content-Type", contentType)
	}
	response := httptest.NewRecorder()
	NewHandler("").ServeHTTP(response, request)
	return response
}
