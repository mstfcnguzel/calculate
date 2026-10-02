package httpapi

import (
	"net/http"

	"sezzle-calculator/internal/calculator"
)

type expressionRequest struct {
	Expression string `json:"expression"`
}

func evaluate(w http.ResponseWriter, r *http.Request) {
	var input *expressionRequest
	if !decodeRequest(w, r, &input) {
		return
	}
	if input == nil {
		writeDecodeError(w, nil)
		return
	}
	result, err := calculator.Evaluate(input.Expression)
	if err != nil {
		writeExpressionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]float64{"result": result})
}

func writeExpressionError(w http.ResponseWriter, err *calculator.ExpressionError) {
	writeJSON(w, expressionErrorStatus(err.Code), struct {
		Error errorDetail `json:"error"`
	}{errorDetail{Code: err.Code, Message: err.Message, Position: err.Position}})
}

func expressionErrorStatus(code string) int {
	switch code {
	case "DIVISION_BY_ZERO", "DOMAIN_ERROR", "RESULT_OUT_OF_RANGE":
		return http.StatusUnprocessableEntity
	default:
		return http.StatusBadRequest
	}
}
