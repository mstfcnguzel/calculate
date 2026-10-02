# Coverage snapshot

Generated from successful test runs on 2026-10-02. Regenerate with `make coverage`.

## Frontend

| Metric | Covered / total | Coverage |
| --- | --- | --- |
| statements | 828/828 | 100% |
| branches | 286/291 | 98.28% |
| functions | 71/71 | 100% |
| lines | 828/828 | 100% |

Bootstrap (`main.tsx`), test files, and configuration are excluded. UI state, input/display helpers, and the API client are included. Tests use jsdom and mocked network calls.

## Backend

| Package | Covered / total statements | Coverage |
| --- | --- | --- |
| internal/apperror | 3/3 | 100.00% |
| internal/httpapi | 86/86 | 100.00% |
| cmd/server | 0/17 | 0.00% |
| internal/calculator | 166/170 | 97.65% |
| **Overall** | **255/276** | **92.39%** |

The server entry point is included and untested by unit tests. The domain and HTTP packages are exercised using Go tests and `httptest`; the test run also enables the race detector.

## Reproduction and raw data

- [Frontend summary](frontend-coverage.json)
- [Backend Go coverage profile](backend-coverage.out)
- `make coverage` creates detailed local HTML reports and refreshes these snapshots.

In the restricted agent environment, the Go build cache and frontend generated reports used writable temporary directories. Production compilation passed; workspace builds retained existing generated assets to avoid prohibited cleanup. Live browser and Docker verification are reported separately in the README and delivery notes.
