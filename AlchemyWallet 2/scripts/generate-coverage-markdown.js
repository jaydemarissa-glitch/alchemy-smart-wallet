#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the coverage summary from Jest's JSON output
const coverageDir = path.join(__dirname, '../coverage');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const markdownOutputPath = path.join(coverageDir, 'coverage-summary.md');

try {
  // Check if coverage summary exists
  if (!fs.existsSync(coverageSummaryPath)) {
    console.log('No coverage summary found, skipping markdown generation');
    process.exit(0);
  }

  const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
  
  // Extract total coverage
  const total = coverageData.total;
  
  const markdown = `## Coverage Report

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| **Statements** | ${total.statements.pct}% (${total.statements.covered}/${total.statements.total}) | 80% |
| **Branches** | ${total.branches.pct}% (${total.branches.covered}/${total.branches.total}) | 80% |
| **Functions** | ${total.functions.pct}% (${total.functions.covered}/${total.functions.total}) | 80% |
| **Lines** | ${total.lines.pct}% (${total.lines.covered}/${total.lines.total}) | 80% |

### Status
${getCoverageStatus(total)}

---
*Coverage report generated on ${new Date().toISOString()}*
`;

  fs.writeFileSync(markdownOutputPath, markdown);
  console.log(`✅ Coverage markdown summary generated at ${markdownOutputPath}`);
  
} catch (error) {
  console.error('Error generating coverage markdown:', error);
  process.exit(1);
}

function getCoverageStatus(total) {
  const threshold = 80;
  const metrics = ['statements', 'branches', 'functions', 'lines'];
  
  const failing = metrics.filter(metric => total[metric].pct < threshold);
  
  if (failing.length === 0) {
    return '✅ All coverage metrics meet the 80% threshold!';
  } else {
    return `⚠️ Coverage below threshold for: ${failing.join(', ')}`;
  }
}