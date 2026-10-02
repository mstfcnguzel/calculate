package calculator

import (
	"fmt"
	"strconv"
	"unicode"

	"sezzle-calculator/internal/apperror"
)

const MaxExpressionLength = 512
const maxExpressionDepth = 64

// ExpressionError includes a one-based character position when applicable.
type ExpressionError = apperror.Error

type token struct {
	kind     rune
	number   float64
	position int
}

type expressionParser struct {
	input   []rune
	cursor  int
	current token
}

// Evaluate parses a bounded arithmetic expression without executing user code.
// Powers associate to the right and bind more tightly than unary signs.
// Postfix percent converts a value to a ratio: 250 * 15% is 37.5.
func Evaluate(expression string) (float64, *ExpressionError) {
	p := expressionParser{input: []rune(expression)}
	if len(p.input) > MaxExpressionLength {
		return 0, apperror.At("EXPRESSION_TOO_LONG", "Use at most 512 characters.", 0)
	}
	if err := p.advance(); err != nil {
		return 0, err
	}
	if p.current.kind == 0 {
		return 0, apperror.At("EMPTY_EXPRESSION", "Enter an expression to calculate.", 0)
	}
	if p.current.kind == ')' {
		return 0, apperror.At("UNEXPECTED_CLOSING_PARENTHESIS", "This closing parenthesis has no matching opening parenthesis.", p.current.position)
	}
	result, err := p.parse(0, 0)
	if err != nil {
		return 0, err
	}
	if p.current.kind != 0 {
		if p.current.kind == ')' {
			return 0, apperror.At("UNEXPECTED_CLOSING_PARENTHESIS", "This closing parenthesis has no matching opening parenthesis.", p.current.position)
		}
		return 0, apperror.At("MISSING_OPERATOR", "Insert an operator between these values.", p.current.position)
	}
	if result == 0 {
		result = 0
	}
	return result, nil
}

func isDigit(ch rune) bool { return ch >= '0' && ch <= '9' }

func (p *expressionParser) advance() *ExpressionError {
	for p.cursor < len(p.input) && unicode.IsSpace(p.input[p.cursor]) {
		p.cursor++
	}
	start := p.cursor
	if start == len(p.input) {
		p.current = token{position: start + 1}
		return nil
	}
	ch := p.input[p.cursor]
	p.cursor++
	switch ch {
	case '+', '-', '*', '/', '^', '%', '(', ')', '√':
		p.current = token{kind: ch, position: start + 1}
		return nil
	case '−', '×', '÷':
		kind := map[rune]rune{'−': '-', '×': '*', '÷': '/'}[ch]
		p.current = token{kind: kind, position: start + 1}
		return nil
	}
	if isDigit(ch) || ch == '.' {
		for p.cursor < len(p.input) && isDigit(p.input[p.cursor]) {
			p.cursor++
		}
		if ch != '.' && p.cursor < len(p.input) && p.input[p.cursor] == '.' {
			p.cursor++
			for p.cursor < len(p.input) && isDigit(p.input[p.cursor]) {
				p.cursor++
			}
		}
		if p.cursor < len(p.input) && (p.input[p.cursor] == 'e' || p.input[p.cursor] == 'E') {
			p.cursor++
			if p.cursor < len(p.input) && (p.input[p.cursor] == '+' || p.input[p.cursor] == '-') {
				p.cursor++
			}
			for p.cursor < len(p.input) && isDigit(p.input[p.cursor]) {
				p.cursor++
			}
		}
		number, err := strconv.ParseFloat(string(p.input[start:p.cursor]), 64)
		if err != nil {
			return apperror.At("INVALID_NUMBER", "Enter a valid, finite decimal number, for example 12.5 or 1e3.", start+1)
		}
		if p.cursor < len(p.input) && (p.input[p.cursor] == '.' || p.input[p.cursor] == 'e' || p.input[p.cursor] == 'E') {
			return apperror.At("INVALID_NUMBER", "A number can have only one decimal point and one exponent.", p.cursor+1)
		}
		p.current = token{kind: 'n', number: number, position: start + 1}
		return nil
	}
	if unicode.IsLetter(ch) {
		for p.cursor < len(p.input) && unicode.IsLetter(p.input[p.cursor]) {
			p.cursor++
		}
		if string(p.input[start:p.cursor]) == "sqrt" {
			p.current = token{kind: '√', position: start + 1}
			return nil
		}
		return apperror.At("UNSUPPORTED_FUNCTION", fmt.Sprintf("Function %q is not supported. Use sqrt(...).", string(p.input[start:p.cursor])), start+1)
	}
	return apperror.At("UNSUPPORTED_CHARACTER", fmt.Sprintf("Character %q is not supported.", ch), start+1)
}

func (p *expressionParser) parse(minBinding, depth int) (float64, *ExpressionError) {
	if depth > maxExpressionDepth {
		return 0, apperror.At("EXPRESSION_TOO_COMPLEX", "Reduce the number of nested parentheses or operators.", p.current.position)
	}
	first := p.current
	if err := p.advance(); err != nil {
		return 0, err
	}
	var left float64
	var err *ExpressionError
	switch first.kind {
	case 'n':
		left = first.number
	case '+', '-':
		left, err = p.parse(25, depth+1)
		if err == nil && first.kind == '-' {
			left = -left
		}
	case '(':
		left, err = p.group(depth + 1)
	case '√':
		if p.current.kind != '(' {
			return 0, apperror.At("FUNCTION_PARENTHESES_REQUIRED", "Use parentheses after sqrt, for example sqrt(9).", p.current.position)
		}
		if err = p.advance(); err == nil {
			left, err = p.group(depth + 1)
		}
		if err == nil {
			left, err = p.apply("sqrt", []float64{left}, first.position)
		}
	default:
		if first.kind == 0 || first.kind == ')' {
			return 0, apperror.At("MISSING_OPERAND", "A value is missing. Enter a number or a parenthesized expression.", first.position)
		}
		return 0, apperror.At("UNEXPECTED_OPERATOR", fmt.Sprintf("Operator %q cannot appear here. Enter a value first.", first.kind), first.position)
	}
	if err != nil {
		return 0, err
	}
	for {
		op := p.current
		if op.kind == '%' {
			if 40 < minBinding {
				break
			}
			if err := p.advance(); err != nil {
				return 0, err
			}
			left, err = p.apply("divide", []float64{left, 100}, op.position)
			if err != nil {
				return 0, err
			}
			continue
		}
		binding := 0
		operation := ""
		switch op.kind {
		case '+':
			binding, operation = 10, "add"
		case '-':
			binding, operation = 10, "subtract"
		case '*':
			binding, operation = 20, "multiply"
		case '/':
			binding, operation = 20, "divide"
		case '^':
			binding, operation = 30, "power"
		default:
			return left, nil
		}
		if binding < minBinding {
			break
		}
		if err := p.advance(); err != nil {
			return 0, err
		}
		if p.current.kind == 0 || p.current.kind == ')' {
			return 0, apperror.At("MISSING_OPERAND", fmt.Sprintf("Operator %q needs a value on its right.", op.kind), p.current.position)
		}
		rightBinding := binding + 1
		if op.kind == '^' {
			rightBinding = binding
		}
		right, err := p.parse(rightBinding, depth+1)
		if err != nil {
			return 0, err
		}
		left, err = p.apply(operation, []float64{left, right}, op.position)
		if err != nil {
			return 0, err
		}
	}
	return left, nil
}

func (p *expressionParser) group(depth int) (float64, *ExpressionError) {
	if p.current.kind == ')' {
		return 0, apperror.At("EMPTY_PARENTHESES", "Parentheses must contain a value or an expression.", p.current.position)
	}
	value, err := p.parse(0, depth)
	if err != nil {
		return 0, err
	}
	if p.current.kind != ')' {
		if p.current.kind == 0 {
			return 0, apperror.At("MISSING_CLOSING_PARENTHESIS", "An opening parenthesis is missing its closing parenthesis.", p.current.position)
		}
		return 0, apperror.At("MISSING_OPERATOR", "Insert an operator between these values.", p.current.position)
	}
	if err := p.advance(); err != nil {
		return 0, err
	}
	return value, nil
}

func (p *expressionParser) apply(operation string, operands []float64, position int) (float64, *ExpressionError) {
	result, err := Calculate(operation, operands)
	if err != nil {
		return 0, apperror.At(err.Code, err.Message, position)
	}
	return result, nil
}
