package calculator

import (
	"math"
	"strings"
	"testing"
)

func TestEvaluate(t *testing.T) {
	tests := []struct {
		expression string
		want       float64
	}{
		{"12.5", 12.5}, {".5 + 2.", 2.5}, {" 1e2 + 2.5E-1\n", 100.25},
		{"2 + 3 * 4", 14}, {"(2 + 3) * 4", 20}, {"((2+3) * (4-1)) / 5", 3},
		{"12 / 3 / 2", 2}, {"10 - 3 - 2", 5}, {"2^3^2", 512},
		{"-2^2", -4}, {"(-2)^2", 4}, {"2^-2", 0.25}, {"-(-3)", 3}, {"+2 + --3", 5},
		{"12.5 × (3 − 1) ÷ 2", 12.5}, {"sqrt(9) + sqrt(16)", 7}, {"√(9+7)", 4},
		{"sqrt(sqrt(81))", 3}, {"15%", 0.15}, {"250 × 15%", 37.5},
		{"(100+150) * (10+5)%", 37.5}, {"200 + 10%", 200.1}, {"100%%", 0.01},
		{"1 + 2^3 * 4", 33}, {"0^0", 1}, {"-0", 0}, {"1e-300 * 1e-300", 0},
		{"-1e-300 * 1e-300", 0},
	}
	for _, tt := range tests {
		t.Run(tt.expression, func(t *testing.T) {
			got, err := Evaluate(tt.expression)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.want == 0 {
				if got != 0 {
					t.Errorf("got %v, want exactly zero", got)
				}
			} else if math.Abs(got-tt.want) > math.Max(1, math.Abs(tt.want))*1e-14 {
				t.Errorf("got %v, want %v", got, tt.want)
			}
			if got == 0 && math.Signbit(got) {
				t.Error("negative zero must be normalized")
			}
		})
	}
}

func TestEvaluateErrors(t *testing.T) {
	tests := []struct {
		expression, code string
		position         int
	}{
		{"", "EMPTY_EXPRESSION", 0}, {" \n ", "EMPTY_EXPRESSION", 0},
		{"1 +", "MISSING_OPERAND", 4}, {"()", "EMPTY_PARENTHESES", 2},
		{"(1+2", "MISSING_CLOSING_PARENTHESIS", 5}, {"1+2)", "UNEXPECTED_CLOSING_PARENTHESIS", 4},
		{"2(3)", "MISSING_OPERATOR", 2}, {"1 2", "MISSING_OPERATOR", 3},
		{"sqrt 9", "FUNCTION_PARENTHESES_REQUIRED", 6}, {"sin(0)", "UNSUPPORTED_FUNCTION", 1},
		{"1,5", "UNSUPPORTED_CHARACTER", 2}, {".", "INVALID_NUMBER", 1},
		{"1e+", "INVALID_NUMBER", 1}, {"1e999", "INVALID_NUMBER", 1},
		{"1;2", "UNSUPPORTED_CHARACTER", 2}, {"2**3", "UNEXPECTED_OPERATOR", 3},
		{"1 / (2 - 2)", "DIVISION_BY_ZERO", 3}, {"sqrt(-1)", "DOMAIN_ERROR", 1},
		{"(-2)^.5", "DOMAIN_ERROR", 5}, {"10^1000", "RESULT_OUT_OF_RANGE", 3},
		{"2 × @", "UNSUPPORTED_CHARACTER", 5},
		{"1..2", "INVALID_NUMBER", 3}, {"1e2e3", "INVALID_NUMBER", 4},
		{")1", "UNEXPECTED_CLOSING_PARENTHESIS", 1}, {"2+)", "MISSING_OPERAND", 3},
		{"(1 2)", "MISSING_OPERATOR", 4}, {"sqrt()", "EMPTY_PARENTHESES", 6},
		{"sqrt(", "MISSING_OPERAND", 6}, {"*2", "UNEXPECTED_OPERATOR", 1},
		{"-", "MISSING_OPERAND", 2},
	}
	for _, tt := range tests {
		t.Run(tt.expression, func(t *testing.T) {
			_, err := Evaluate(tt.expression)
			if err == nil || err.Code != tt.code || err.Position != tt.position {
				t.Fatalf("got %+v, want %s at %d", err, tt.code, tt.position)
			}
			if err.Error() == "" {
				t.Error("error requires a message")
			}
		})
	}
}

func TestExpressionLimits(t *testing.T) {
	if got, err := Evaluate(strings.Repeat(" ", 511) + "1"); err != nil || got != 1 {
		t.Fatalf("boundary rejected: %v", err)
	}
	_, err := Evaluate(strings.Repeat("1", 513))
	if err == nil || err.Code != "EXPRESSION_TOO_LONG" {
		t.Fatalf("length limit: %v", err)
	}
	for _, expression := range []string{strings.Repeat("(", 70) + "1" + strings.Repeat(")", 70), strings.Repeat("-", 70) + "1", strings.Repeat("2^", 70) + "1"} {
		_, err := Evaluate(expression)
		if err == nil || err.Code != "EXPRESSION_TOO_COMPLEX" {
			t.Fatalf("depth limit: %v", err)
		}
	}
}

func FuzzEvaluate(f *testing.F) {
	for _, expression := range []string{"(2+3)*4", "sqrt(9)", "2^-2", "250*15%", "(", "1e400", "×", ""} {
		f.Add(expression)
	}
	f.Fuzz(func(t *testing.T, expression string) {
		result, err := Evaluate(expression)
		if err == nil && (math.IsNaN(result) || math.IsInf(result, 0)) {
			t.Fatalf("non-finite successful result: %v", result)
		}
	})
}
