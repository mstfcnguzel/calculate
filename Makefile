.PHONY: test check coverage

test:
	go -C backend test -race ./...
	npm --prefix frontend test

check:
	go -C backend vet ./...
	@test -z "$$(gofmt -l backend)" || (echo "Run gofmt -w backend"; exit 1)
	npm --prefix frontend run format:check
	npm --prefix frontend run build

coverage:
	go -C backend test -race -coverprofile=coverage.out ./...
	go -C backend tool cover -html=coverage.out -o coverage.html
	npm --prefix frontend run test:coverage
	node scripts/update-coverage.mjs
