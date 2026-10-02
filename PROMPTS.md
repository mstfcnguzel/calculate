# AI prompts and development record

Codex was used interactively for implementation, tests, and documentation. No sub-agents were used. The user supplied the assignment and clarified the product rules; the agent made routine implementation choices within that scope. The following records the user prompts used for the work. Tool calls are development actions, not additional human prompts.

## Assignment brief (verbatim text, formatting normalized)

> **Objective** Build a full-stack calculator application with a **React frontend** and a backend microservice. The frontend should consume the backend API to perform basic and advanced arithmetic operations. Focus on clean design, maintainable code, and testable architecture.
>
> **Requirements Functional Operations:**
> - Addition, Subtraction, Multiplication, Division
> - Optional: Exponentiation, Square Root, Percentage
>
> **Frontend (React):**
> - Intuitive UI for entering input and displaying results
> - Input validation and error handling
> - Responsive design (basic mobile support)
>
> **Backend (REST API):**
> - Expose endpoints for calculator operations
> - Validate input and handle edge cases (division by zero, invalid data)
> - Return results in JSON format
>
> **Non-Functional**
> - Clean, readable, and idiomatic code (frontend and backend)
> - Unit tests covering key functionality for both layers
> - Documentation: setup instructions, API usage, and design rationale
> - Optional: Dockerfile for full-stack deployment
>
> **Constraints**
> - Frontend: React (TypeScript preferred)
> - Backend: Go is perferred
>
> **Deliverables**
> 1. Git repository with frontend and backend code
> 2. README with setup instructions, API examples, and design decisions
> 3. Unit tests and coverage report
> 4. Optional: Dockerfile to run frontend + backend together
>
> **Instructions**
> 1. Use any AI tooling you would like
> 2. Spend ~**2–4 hours** on this assignment. Prioritize correctness, clarity, and maintainability over extra features.
> 3. Push your solution to **GitHub, GitLab, or another Git repository**.
> 4. Share the repository link with us for evaluation.
> 5. Share any prompts that you used in your work
> 6. Make sure your README includes:
>    - Setup instructions
>    - How to run the frontend and backend
>    - Examples of API calls (if using REST)
>    - Design decisions or assumptions
>
> şöyle bir asingment aldım bunu yapmak için bir incele, sorun varsa sor beraber tasarlayıp bunu yapalım

## Product clarification (verbatim)

> Yüzde: a’nın yüzde b’si
> Sayı hassasiyeti: `float64` iyi
> İşlem kapsamı: ilk sürüm için tek işlem mantıklı, uygulamanın ayağa kalktığını görelim. Ama sonraki sürümlere matematiksel ifadelerin çözümlenmesi olsun (patantezle vs)

## Implementation choices communicated to the user

- React/TypeScript + Vite, Go standard-library HTTP service.
- One operation per request; percentage defined as a × b / 100.
- An English interface with operation selection and operand fields; English documentation.
- Seven operations including powers, square roots, and percentages.
- A separate roadmap for parentheses and operator-precedence parsing rather than expression evaluation in v1.
- Pure arithmetic and HTTP contract tests in Go; React component, API-client, and input/display tests in Vitest.

## Environment-related replies (verbatim)

When asked about allowing npm registry access:

> maalesef ama ell ekleyebilirim

When asked to run `npm install` in the frontend directory:

> tamamdır haber vericem

## Validation transparency

The user installed frontend dependencies because the agent's environment blocked npm registry access. Build and tests were run against those installed dependencies and the resulting lockfile. The agent used writable temporary directories for Go's build cache and frontend output/coverage because this environment blocks some cleanup operations in the workspace.

Early tests found negative-zero formatting and Reset focus issues, which were fixed. An initial Go compile error and a test-hook setup error were also corrected. The final measured coverage is in `reports/coverage.md`; coverage claims refer to successful runs only.

The environment prevented the agent from binding a local server port. The user was given commands to start both processes locally. A live browser smoke test, Docker execution, and repository publication must be reported with their actual completion status; they are not implied by passing unit tests.

## Expression/keypad iteration (user prompt, formatting normalized)

> güzel dizaynları beğendim hesap makinesi de çalışıyor gibi görünüyor. Şimdi sırada:
> 1. Text alanı gibi input alan bir yer yapalım bu alanı işlemi yazdığımızda sonucunu bulsun. Ve butonlar bu alana işlemin işaretini bu alana yazsın.
> 2. Text alanı ile birlikte sayılar da girebileceğimiz butonlar olsun. Ondalık belirtmek için nokta işareti vb gibi işaretleride ekle
> 3. Bilgisayarlarda kullanılan calculator ları örnek alabilirsin ona daha yakın olsun

The user confirmed that the initial design and calculator appeared to work. This follow-up expanded scope to an expression editor and a desktop-style keypad. The agent implemented server-side expression evaluation with a bounded Pratt parser, preserved the existing single-operation API, and added cursor-aware text-editing controls. Percent is a postfix ratio in expressions, so the earlier amount/percentage meaning is written as `250 × 15%`.

The expression iteration passed 53 frontend tests, Go unit/HTTP tests with the race detector, and a short fuzz run covering 952,509 inputs. The updated coverage snapshot is under `reports/`. A local server restart was requested for live verification because the currently running binary cannot load new backend routes without restarting.

The user's reply to the restart request was:

> başlattım

After restart, the agent verified the running app through the in-app browser. Typed expressions, keypad digits/decimal points, caret insertion, result continuation, square roots, percentages, right-associative powers, Enter submission, and division-by-zero errors worked against the real Go API. The mobile viewport had no horizontal overflow. Screenshots are saved under `reports/screenshots/`.

## Frontend formatting (user prompt, verbatim)

> frontend tarafını okuması biraz zorlu özellikle App.ts o yüzden kod stilini düzenle eslint benzeri bir düzene geçebilirsin, daha okunaklı olsun. işlevselliğe dokunma

The agent added a shared Prettier configuration and format/check commands, and applied formatting to the frontend without changing application logic.

Validation passed: the formatting check, all 53 frontend tests, TypeScript checking, and the production build. Comparing parsed JavaScript emitted by TypeScript before and after formatting found identical executable syntax trees across all nine top-level source/test files, ignoring comments and source locations.

## Page/component organization (user prompt, verbatim)

> Api callarını ve girişleriniz methodlara ayırabilirsin backend ve frontent tarafında daha okunaklı olsun diye, Aynı zamanda tekrar kullanabilirlik açısından react componentleri yazabilirsin ilgili methodlarıda oraya koyarsın biraz daha toplu olur. Ayrıca sayfaların kendi dosyası olsun ve burada componetler css ler gibi şeyler olsun  gelecek için daha rahat bir geliştirme ve inceleme alanı olur.

The agent separated the calculator page, typed UI components with colocated styles, shared layout, the editing/request-lifecycle hook, pure model helpers, the calculator API service, and JSON HTTP transport. Go route registration, calculation/expression handlers, request decoding, and response writing were also separated. This iteration preserves the existing UI behavior and HTTP contracts.

All 53 existing frontend tests, Go tests with the race detector, Go vet, TypeScript checking, formatting, and production build passed. The initial rendered DOM matched the previous version, and all 99 CSS rules retained their declarations. Coverage snapshots were regenerated: frontend lines 100%, branches 97.22%; Go HTTP statements 100%, overall 91.98%. The attempted live browser recheck could not complete because localhost:8080 refused the connection.

## Input cleanup and error handling (user prompts, verbatim)

> İyi bir düzenleme oldu. Şimdi hata geliştime üzerine gidelim birbiri ile eşleşmeye parantezler, fazlalık parantezler, işlem sonundaki fazlalık operatör elensin bizim için bir anlamı yok, frontend de ele ki elendiğinde ön yüzdeki text alanda güncellensin. Ek olarak klavyeden kullanımı bizim i.in anlamlı olmayan harf,işaret vb şeyleri girildiğinde kabul etmeyelim. Ayrıca backend formül hatalı olduğunda hatanın ne olduğuna dair bir error atsın ve frontend bunu düzgün bir şekilde göstersin. Bunlar için yine genel classlar yap fe ve be de sonra onlar üzerinden özelleştir.
>
> Bu yazdıklarımı bir incele ve planla sorun varsa sor

The agent proposed shared structured errors, input rules, submission-time cleanup, and specific backend syntax categories. It asked when cleanup should run and whether unmatched opening parentheses should be removed, completed, or reported as errors. The user replied:

> parantez de tamamlamak daha iyi bir seçenek gibi geliyor bana ama sonuna kadar alsın ortasında durmasına gerek yok.  temizliğin zamanını anlamadım ama üste  yazdığın kurallar bana mantıklı geldi öyle ilerliyebilirsin

The implementation appends missing closing parentheses at the end on Calculate/Enter, removes unmatched closing parentheses and trailing binary operators, and collapses redundant nested wrappers while preserving precedence/function parentheses. The textarea and API use the same cleaned expression. Unsupported keyboard/paste edits are rejected atomically; incomplete function/scientific input remains editable. Frontend AppError/InputPolicy abstractions and a shared Go apperror type support domain-specific errors. The backend remains strict for direct API callers and reports specific syntax codes, messages, and Unicode positions.

Validation passed: 130 frontend tests, Go tests with the race detector, Go vet, formatting, TypeScript, and both production builds. Coverage is in reports/coverage.md. A five-second parser fuzz run exercised 903,539 inputs without failure. The user replied “tamamdır” to the local-server restart request; the subsequent live browser check verified cleanup/results, invalid keyboard and paste rejection, selection preservation, and specific backend errors/highlighting. Screenshots are saved under reports/screenshots/.

## Small product improvements (user prompt, verbatim)

After the agent suggested correction feedback (1), copying results (2), end-to-end automation (3), clean-install/delivery verification (4), and approximate-result markers (5), the user selected:

> 1,2,5 mantıklı geldi ekle gerisini ben kontrol ederim

The agent implemented a correction summary near the editor, a reusable CopyButton with success/failure feedback, and an approximation marker only when the displayed 15-significant-digit number differs from the backend value. Copied values match the displayed number without thousands separators or the approximation symbol; result reuse and subsequent calculations keep full backend precision. No new dependency was needed.

Validation passed: 154 frontend tests, formatting, TypeScript checking, and the production build. Frontend coverage is 100% for statements, lines, and functions, and 98.16% for branches. A live browser check against the existing Go API confirmed correction feedback, the approximate result marker, and clipboard content `0.3`. The screenshot is under reports/screenshots/calculator-product-polish.jpg. Backend code was unchanged; no new end-to-end automation or delivery work was added in this iteration.

## Unfinished trailing input (user prompt, verbatim)

> -Sonda ( başlangıç parantezi gelince tamamlıyorsun o temizlenmeli aslında
> -sqrt tam yazılmadığında temizleyebilirsin

On Calculate/Enter, the frontend now removes empty opening parentheses and incomplete `sqrt` prefixes (`s`, `sq`, `sqr`) at the end. Cleanup repeats when removing a prefix exposes an opening parenthesis or trailing operator. It preserves groups containing expressions, which still receive closing parentheses at the very end. The editor and submitted expression stay synchronized, and the existing correction notice explains the cleanup. Invalid tokens inside expressions and explicit empty function arguments remain backend errors. No backend changes or dependencies were needed.

Validation passed: 177 frontend tests, formatting, TypeScript checking, and the production build. Frontend coverage is 100% for statements, lines, and functions, and 98.25% for branches. A live browser check confirmed trailing-opening cleanup, incomplete-function cleanup, and unchanged completion for groups containing expressions. Screenshot: reports/screenshots/calculator-trailing-input.jpg.

## Review corrections (user findings, verbatim)

> 1. **[P2 — Hata] Geçerli büyük sonuçlar `Infinity` olarak gösteriliyor.**
> [calculator.ts (line 6)](/Users/mstfcnguzel/IdeaProjects/sezzle/frontend/src/pages/calculator/model/calculator.ts:6) sayıyı 15 anlamlı basamağa yuvarlayıp yeniden `Number`’a dönüştürüyor. `1.7976931348623157e308` için bu dönüşüm taşarak `Infinity` üretiyor. Doğrudan kodu çalıştırarak pozitif ve negatif değerlerde doğruladım. **Copy result** da geçersiz `Infinity` metnini kopyalıyor. Sonlu kalmayı koruyan bir formatlama ve `±Number.MAX_VALUE` testleri gerekiyor.
>
> 2. **[P3 — Test zayıflığı] Underflow testleri yanlış sonuçları kabul edebilir.**
> [calculator_test.go (line 43)](/Users/mstfcnguzel/IdeaProjects/sezzle/backend/internal/calculator/calculator_test.go:43) ve [expression_test.go (line 31)](/Users/mstfcnguzel/IdeaProjects/sezzle/backend/internal/calculator/expression_test.go:31) en az `1e-14` tolerans kullanıyor. Sıfır beklenen underflow senaryosunda yanlışlıkla `1e-300` dönse test geçer. Bu senaryolarda sıfır için kesin eşitlik kullanılmalı.
>
> 3. **[P3 — Dokümantasyon] README’de geliştirme geçmişi fazla yer kaplıyor.**
> [README.md (line 303)](/Users/mstfcnguzel/IdeaProjects/sezzle/README.md:303) sonrasında farklı iterasyonların test sayıları ve ortam sorunları anlatılıyor. Değerlendirici için tek güncel doğrulama özeti daha açık olur; geçmiş detaylar zaten [PROMPTS.md](/Users/mstfcnguzel/IdeaProjects/sezzle/PROMPTS.md) içinde tutulabilir.
>
> review ettirdim bunlar mantıklı geldi

The agent first reproduced the overflow with six failing regression cases for formatting, presentation, and UI/clipboard behavior at both signs of Number.MAX_VALUE. The formatter now keeps the original finite number's string when 15-significant-digit rounding would overflow; normal formatting remains unchanged. Go tests compare all expected-zero results exactly and include negative underflow cases while retaining negative-zero normalization checks. README iteration history was removed in favor of one current validation summary; the historical records remain here.

Validation passed: 183 frontend tests, Go tests with the race detector, Go vet, frontend formatting, TypeScript, and the production frontend build. Coverage snapshots were refreshed: frontend statements/lines/functions 100%, branches 98.28%; backend overall statements 92.39%. A live browser check against the Go API verified finite display and matching clipboard content for both boundary signs. Screenshot: reports/screenshots/calculator-finite-boundary.jpg. No backend production behavior or dependencies changed.
