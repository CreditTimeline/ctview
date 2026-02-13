import { getDashboard, listTradelines, listScores } from '@ctview/core';
import { apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-GB');
}

export const GET: RequestHandler = ({ url, locals }) => {
  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'subjectId query parameter is required');
  }

  const dashboard = getDashboard(locals.db);
  const tradelines = listTradelines(locals.db, { subjectId, limit: 100, offset: 0 });
  const scores = listScores(locals.db, { subjectId, limit: 100, offset: 0 });

  const html = buildDashboardHtml(subjectId, dashboard, tradelines.items, scores.items);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="dashboard-${subjectId}.html"`,
    },
  });
};

function buildDashboardHtml(
  subjectId: string,
  dashboard: ReturnType<typeof getDashboard>,
  tradelines: {
    tradelineId: string;
    furnisherName: string | null;
    accountType: string | null;
    statusCurrent: string | null;
    latestBalance: number | null;
    latestCreditLimit: number | null;
  }[],
  scores: {
    scoreId: string;
    scoreType: string | null;
    scoreName: string | null;
    scoreValue: number | null;
    scoreMin: number | null;
    scoreMax: number | null;
    calculatedAt: string | null;
    sourceSystem: string;
  }[],
): string {
  const now = new Date().toISOString().slice(0, 10);

  const scoreRows = scores
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.sourceSystem)}</td>
        <td>${escapeHtml(s.scoreName ?? s.scoreType ?? '-')}</td>
        <td class="num">${fmtNum(s.scoreValue)}</td>
        <td class="num">${fmtNum(s.scoreMin)} - ${fmtNum(s.scoreMax)}</td>
        <td>${escapeHtml(s.calculatedAt ?? '-')}</td>
      </tr>`,
    )
    .join('');

  const tradelineRows = tradelines
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.furnisherName ?? '-')}</td>
        <td>${escapeHtml(t.accountType ?? '-')}</td>
        <td>${escapeHtml(t.statusCurrent ?? '-')}</td>
        <td class="num">${fmtNum(t.latestBalance)}</td>
        <td class="num">${fmtNum(t.latestCreditLimit)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Credit Dashboard - ${escapeHtml(subjectId)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; padding: 24px; max-width: 900px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 20px; font-size: 12px; }
  h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 12px; }
  .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 20px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 6px 8px; background: #f0f0f0; border: 1px solid #ddd; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 8px; border: 1px solid #ddd; font-size: 12px; }
  tr:nth-child(even) { background: #fafafa; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #999; font-style: italic; padding: 12px; text-align: center; }
  @media print {
    body { padding: 0; font-size: 11px; }
    .stat { border: 1px solid #ccc; }
    tr:nth-child(even) { background: none; }
    h1, h2 { break-after: avoid; }
    table { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>Credit Dashboard</h1>
<p class="subtitle">Subject: ${escapeHtml(subjectId)} | Generated: ${now}</p>

<h2>Summary</h2>
<div class="stats">
  <div class="stat"><div class="stat-label">Tradelines</div><div class="stat-value">${dashboard.counts.tradelines}</div></div>
  <div class="stat"><div class="stat-label">Imports</div><div class="stat-value">${dashboard.counts.imports}</div></div>
  <div class="stat"><div class="stat-label">Searches</div><div class="stat-value">${dashboard.counts.searches}</div></div>
  <div class="stat"><div class="stat-label">Scores</div><div class="stat-value">${dashboard.counts.scores}</div></div>
  <div class="stat"><div class="stat-label">Public Records</div><div class="stat-value">${dashboard.counts.publicRecords}</div></div>
  <div class="stat"><div class="stat-label">Addresses</div><div class="stat-value">${dashboard.counts.addresses}</div></div>
</div>

<h2>Debt Summary</h2>
<div class="stats">
  <div class="stat"><div class="stat-label">Total Balance</div><div class="stat-value">${fmtNum(dashboard.debtSummary.totalBalance)}</div></div>
  <div class="stat"><div class="stat-label">Total Credit Limit</div><div class="stat-value">${fmtNum(dashboard.debtSummary.totalCreditLimit)}</div></div>
  <div class="stat"><div class="stat-label">Open Tradelines</div><div class="stat-value">${dashboard.debtSummary.openTradelineCount}</div></div>
</div>

<h2>Credit Scores</h2>
${
  scores.length > 0
    ? `<table>
  <thead><tr><th>Source</th><th>Name</th><th>Value</th><th>Range</th><th>Date</th></tr></thead>
  <tbody>${scoreRows}</tbody>
</table>`
    : '<p class="empty">No credit scores recorded.</p>'
}

<h2>Tradelines</h2>
${
  tradelines.length > 0
    ? `<table>
  <thead><tr><th>Furnisher</th><th>Type</th><th>Status</th><th>Balance</th><th>Limit</th></tr></thead>
  <tbody>${tradelineRows}</tbody>
</table>`
    : '<p class="empty">No tradelines recorded.</p>'
}

</body>
</html>`;
}
