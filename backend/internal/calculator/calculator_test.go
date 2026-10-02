package calculator

import (
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name, operation string
		operands        []float64
		want            float64
	}{
		{"addition", "add", []float64{12, 3}, 15},
		{"decimal addition", "add", []float64{0.1, 0.2}, 0.3},
		{"negative subtraction", "subtract", []float64{-4, 3}, -7},
		{"multiplication", "multiply", []float64{-2.5, 4}, -10},
		{"division", "divide", []float64{10, 4}, 2.5},
		{"zero numerator", "divide", []float64{0, -3}, 0},
		{"power", "power", []float64{2, 10}, 1024},
		{"negative exponent", "power", []float64{2, -2}, 0.25},
		{"negative base integer exponent", "power", []float64{-2, 3}, -8},
		{"fractional exponent", "power", []float64{9, 0.5}, 3},
		{"zero to zero", "power", []float64{0, 0}, 1},
		{"square root", "sqrt", []float64{81}, 9},
		{"square root of zero", "sqrt", []float64{0}, 0},
		{"percentage", "percentage", []float64{250, 15}, 37.5},
		{"percentage above 100", "percentage", []float64{50, 200}, 100},
		{"negative percentage", "percentage", []float64{200, -10}, -20},
		{"percentage of zero", "percentage", []float64{0, 15}, 0},
		{"percentage avoids intermediate overflow", "percentage", []float64{1e308, 50}, 5e307},
		{"negative zero", "multiply", []float64{0, -1}, 0},
		{"underflow follows float64", "multiply", []float64{1e-300, 1e-300}, 0},
		{"negative underflow follows float64", "multiply", []float64{-1e-300, 1e-300}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.operands)
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

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name, operation string
		operands        []float64
		code            string
	}{
		{"unknown operation", "modulo", []float64{1, 2}, "UNKNOWN_OPERATION"},
		{"empty operation", "", []float64{1, 2}, "UNKNOWN_OPERATION"},
		{"missing operands", "add", nil, "INVALID_OPERANDS"},
		{"one binary operand", "add", []float64{1}, "INVALID_OPERANDS"},
		{"too many operands", "divide", []float64{1, 2, 3}, "INVALID_OPERANDS"},
		{"extra unary operand", "sqrt", []float64{1, 2}, "INVALID_OPERANDS"},
		{"NaN operand", "add", []float64{math.NaN(), 2}, "INVALID_OPERANDS"},
		{"positive infinite operand", "add", []float64{1, math.Inf(1)}, "INVALID_OPERANDS"},
		{"negative infinite operand", "sqrt", []float64{math.Inf(-1)}, "INVALID_OPERANDS"},
		{"division by zero", "divide", []float64{1, 0}, "DIVISION_BY_ZERO"},
		{"division by negative zero", "divide", []float64{1, math.Copysign(0, -1)}, "DIVISION_BY_ZERO"},
		{"negative square root", "sqrt", []float64{-1}, "DOMAIN_ERROR"},
		{"complex power", "power", []float64{-2, 0.5}, "DOMAIN_ERROR"},
		{"zero with negative exponent", "power", []float64{0, -1}, "DIVISION_BY_ZERO"},
		{"addition overflow", "add", []float64{math.MaxFloat64, math.MaxFloat64}, "RESULT_OUT_OF_RANGE"},
		{"multiplication overflow", "multiply", []float64{math.MaxFloat64, 2}, "RESULT_OUT_OF_RANGE"},
		{"power overflow", "power", []float64{10, 1000}, "RESULT_OUT_OF_RANGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calculate(tt.operation, tt.operands)
			if err == nil || err.Code != tt.code {
				t.Fatalf("got error %v, want code %s", err, tt.code)
			}
			if err.Error() == "" {
				t.Error("error must include a message")
			}
		})
	}
}
