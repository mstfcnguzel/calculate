package apperror

import (
	"encoding/json"
	"errors"
	"fmt"
	"testing"
)

func TestErrorCanBeRecoveredThroughWrapping(t *testing.T) {
	original := At("MISSING_OPERAND", "Add a value after +.", 3)
	wrapped := fmt.Errorf("calculation failed: %w", original)
	var detail *Error
	if !errors.As(wrapped, &detail) || detail != original {
		t.Fatal("structured details must survive standard error wrapping")
	}
	if detail.Code != "MISSING_OPERAND" || detail.Position != 3 || detail.Error() != "Add a value after +." {
		t.Fatalf("unexpected details: %+v", detail)
	}
}

func TestErrorJSONContract(t *testing.T) {
	tests := []struct {
		err  *Error
		want string
	}{
		{New("NETWORK_ERROR", "Unavailable."), `{"code":"NETWORK_ERROR","message":"Unavailable."}`},
		{At("INVALID_NUMBER", "Invalid decimal.", 4), `{"code":"INVALID_NUMBER","message":"Invalid decimal.","position":4}`},
	}
	for _, tt := range tests {
		encoded, err := json.Marshal(tt.err)
		if err != nil || string(encoded) != tt.want {
			t.Fatalf("error contract changed: %s, %v", encoded, err)
		}
	}
}
