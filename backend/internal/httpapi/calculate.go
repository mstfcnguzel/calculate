package httpapi

import (
	"net/http"

	"sezzle-calculator/internal/calculator"
)

type calculationRequest struct {
	Operation string     `json:"operation"`
	Operands  []*float64 `json:"operands"`
}

func calculate(w http.ResponseWriter, r *http.Request) {
	var input *calculationRequest
	if !decodeRequest(w, r, &input) {
		return
	}
	if input == nil {
		writeDecodeError(w, nil)
		return
	}
	operands, valid := readOperands(w, input.Operands)
	if !valid {
		return
	}
	result, calcErr := calculator.Calculate(input.Operation, operands)
	if calcErr != nil {
		writeError(w, calculationErrorStatus(calcErr.Code), calcErr.Code, calcErr.Message)
		return
	}
	writeJSON(w, http.StatusOK, map[string]float64{"result": result})
}

func readOperands(w http.ResponseWriter, input []*float64) ([]float64, bool) {
	operands := make([]float64, len(input))
	for i, operand := range input {
		if operand == nil {
			writeError(w, http.StatusBadRequest, "INVALID_OPERANDS", "Operands must be numbers, not null.")
			return nil, false
		}
		operands[i] = *operand
	}
	return operands, true
}

func calculationErrorStatus(code string) int {
	if code == "UNKNOWN_OPERATION" || code == "INVALID_OPERANDS" {
		return http.StatusBadRequest
	}
	return http.StatusUnprocessableEntity
}
