// Package calculator implements a single arithmetic operation on finite real numbers.
package calculator

import (
	"math"

	"sezzle-calculator/internal/apperror"
)

// Error describes a validation or arithmetic error independently of HTTP.
type Error = apperror.Error

// Calculate performs exactly one operation; square root takes one operand,
// all other operations take two. Percentage means a * b / 100.
func Calculate(operation string, operands []float64) (float64, *Error) {
	count := 2
	switch operation {
	case "add", "subtract", "multiply", "divide", "power", "percentage":
	case "sqrt":
		count = 1
	default:
		return 0, apperror.New("UNKNOWN_OPERATION", "Choose a supported operation.")
	}
	if len(operands) != count {
		return 0, apperror.New("INVALID_OPERANDS", "Provide the required number of operands.")
	}
	for _, operand := range operands {
		if math.IsNaN(operand) || math.IsInf(operand, 0) {
			return 0, apperror.New("INVALID_OPERANDS", "Operands must be finite numbers.")
		}
	}
	a := operands[0]
	var result float64
	switch operation {
	case "add":
		result = a + operands[1]
	case "subtract":
		result = a - operands[1]
	case "multiply":
		result = a * operands[1]
	case "divide":
		if operands[1] == 0 {
			return 0, apperror.New("DIVISION_BY_ZERO", "Cannot divide by zero.")
		}
		result = a / operands[1]
	case "power":
		if a == 0 && operands[1] < 0 {
			return 0, apperror.New("DIVISION_BY_ZERO", "Zero cannot be raised to a negative power.")
		}
		if a < 0 && math.Trunc(operands[1]) != operands[1] {
			return 0, apperror.New("DOMAIN_ERROR", "A negative base requires an integer exponent.")
		}
		result = math.Pow(a, operands[1])
	case "sqrt":
		if a < 0 {
			return 0, apperror.New("DOMAIN_ERROR", "Square root requires a non-negative number.")
		}
		result = math.Sqrt(a)
	case "percentage":
		result = a * (operands[1] / 100)
	}
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, apperror.New("RESULT_OUT_OF_RANGE", "The result is outside the supported numeric range.")
	}
	if result == 0 {
		result = 0 // Normalize negative zero for consistent JSON and UI output.
	}
	return result, nil
}
