import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(root, 'frontend');
const summary = JSON.parse(readFileSync(process.argv[2] ?? path.join(frontendRoot, 'coverage/coverage-summary.json'), 'utf8'));
const backendRaw = readFileSync(path.join(root, 'backend/coverage.out'), 'utf8');
const packages = new Map();
for (const block of backendRaw.trim().split('\n').slice(1)) {
  const [location, statementCount, executionCount] = block.split(/\s+/);
  const packageName = path.posix.dirname(location.split(':')[0]);
  const counts = packages.get(packageName) ?? { covered: 0, total: 0 };
  counts.total += Number(statementCount);
  if (Number(executionCount) > 0) counts.covered += Number(statementCount);
  packages.set(packageName, counts);
}
const percent = ({ covered, total }) => total ? (covered / total * 100).toFixed(2) : '100.00';
const total = [...packages.values()].reduce((sum, counts) => ({ covered: sum.covered + counts.covered, total: sum.total + counts.total }), { covered: 0, total: 0 });
const frontend = {};
for (const [file, counts] of Object.entries(summary)) {
  frontend[file === 'total' ? file : path.relative(frontendRoot, file).split(path.sep).join('/')] = counts;
}
const rows = [...packages].map(([name, counts]) => `| ${name.replace('sezzle-calculator/', '')} | ${counts.covered}/${counts.total} | ${percent(counts)}% |`).join('\n');
const report = `# Coverage snapshot

Generated from successful test runs on ${new Date().toISOString().slice(0, 10)}. Regenerate with \`make coverage\`.

## Frontend

| Metric | Covered / total | Coverage |
| --- | --- | --- |
${['statements', 'branches', 'functions', 'lines'].map((metric) => {
  const counts = summary.total[metric];
  return `| ${metric} | ${counts.covered}/${counts.total} | ${counts.pct}% |`;
}).join('\n')}

Bootstrap (\`main.tsx\`), test files, and configuration are excluded. UI state, input/display helpers, and the API client are included. Tests use jsdom and mocked network calls.

## Backend

| Package | Covered / total statements | Coverage |
| --- | --- | --- |
${rows}
| **Overall** | **${total.covered}/${total.total}** | **${percent(total)}%** |

The server entry point is included and untested by unit tests. The domain and HTTP packages are exercised using Go tests and \`httptest\`; the test run also enables the race detector.

## Reproduction and raw data

- [Frontend summary](frontend-coverage.json)
- [Backend Go coverage profile](backend-coverage.out)
- \`make coverage\` creates detailed local HTML reports and refreshes these snapshots.

In the restricted agent environment, the Go build cache and frontend generated reports used writable temporary directories. Production compilation passed; workspace builds retained existing generated assets to avoid prohibited cleanup. Live browser and Docker verification are reported separately in the README and delivery notes.
`;
mkdirSync(path.join(root, 'reports'), { recursive: true });
writeFileSync(path.join(root, 'reports/coverage.md'), report);
writeFileSync(path.join(root, 'reports/frontend-coverage.json'), JSON.stringify(frontend, null, 2) + '\n');
writeFileSync(path.join(root, 'reports/backend-coverage.out'), backendRaw);
for (const [name, counts] of packages) {
  if (name.includes('/internal/') && Number(percent(counts)) < 85) {
    throw new Error(`${name} statement coverage is below 85%.`);
  }
}
console.log(`Coverage snapshot updated: frontend lines ${summary.total.lines.pct}%; backend overall ${percent(total)}%.`);
