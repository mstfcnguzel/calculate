package httpapi

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestEvaluateEndpoint(t *testing.T) {
	response := performRequest("POST", "/api/v1/evaluate", `{"expression":"(12.5+3) × 2"}`, "application/json")
	if response.Code != 200 || strings.TrimSpace(response.Body.String()) != `{"result":31}` {
		t.Fatalf("unexpected response: %d %s", response.Code, response.Body)
	}
}

func TestEvaluateEndpointErrors(t *testing.T) {
	tests := []struct {
		body     string
		status   int
		code     string
		position int
	}{
		{`null`, 400, "INVALID_JSON", 0}, {`{}`, 400, "EMPTY_EXPRESSION", 0},
		{`{"expression":12}`, 400, "INVALID_JSON", 0}, {`{"expression":"2","extra":true}`, 400, "INVALID_JSON", 0},
		{`{"expression":"2 +"}`, 400, "MISSING_OPERAND", 4},
		{`{"expression":"1..2"}`, 400, "INVALID_NUMBER", 3},
		{`{"expression":"sqrt()"}`, 400, "EMPTY_PARENTHESES", 6},
		{`{"expression":"(1+2"}`, 400, "MISSING_CLOSING_PARENTHESIS", 5},
		{`{"expression":"1+2)"}`, 400, "UNEXPECTED_CLOSING_PARENTHESIS", 4},
		{`{"expression":"2**3"}`, 400, "UNEXPECTED_OPERATOR", 3},
		{`{"expression":"2(3)"}`, 400, "MISSING_OPERATOR", 2},
		{`{"expression":"sin(9)"}`, 400, "UNSUPPORTED_FUNCTION", 1},
		{`{"expression":"2×@"}`, 400, "UNSUPPORTED_CHARACTER", 3},
		{`{"expression":"sqrt 9"}`, 400, "FUNCTION_PARENTHESES_REQUIRED", 6},
		{`{"expression":"1÷0"}`, 422, "DIVISION_BY_ZERO", 2},
		{`{"expression":"sqrt(-1)"}`, 422, "DOMAIN_ERROR", 1},
		{`{"expression":"10^1000"}`, 422, "RESULT_OUT_OF_RANGE", 3},
		{`{"expression":"` + strings.Repeat("1", 513) + `"}`, 400, "EXPRESSION_TOO_LONG", 0},
	}
	for _, tt := range tests {
		response := performRequest("POST", "/api/v1/evaluate", tt.body, "application/json")
		var payload struct {
			Error errorDetail `json:"error"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		if response.Code != tt.status || payload.Error.Code != tt.code || payload.Error.Position != tt.position || payload.Error.Message == "" {
			t.Errorf("unexpected response: %d %+v", response.Code, payload)
		}
	}
	response := performRequest("GET", "/api/v1/evaluate", "", "")
	if response.Code != 405 {
		t.Errorf("expected 405, got %d", response.Code)
	}
}
