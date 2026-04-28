/**
 * TestivAI Report — HTML Template
 *
 * Single-file HTML with inlined CSS/JS.
 * Dark navy sidebar, cyan accents, summary cards,
 * Changed → New → Passed sections, 3-column diff view,
 * approve command copy button, cloud upgrade CTA, image zoom overlay.
 */

import { ReportData, SnapshotResult } from './results';

/**
 * Render a standalone HTML report from report data.
 */
export function renderHtml(data: ReportData): string {
  const { summary, snapshots, version, timestamp } = data;

  const changed = snapshots.filter((s) => s.status === 'changed');
  const newSnapshots = snapshots.filter((s) => s.status === 'new');
  const passed = snapshots.filter((s) => s.status === 'passed');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestivAI Visual Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; display: flex; min-height: 100vh; }

    /* Sidebar */
    .sidebar { width: 260px; background: #08111f; padding: 24px 16px; flex-shrink: 0; border-right: 1px solid #21262d; position: fixed; height: 100vh; overflow-y: auto; }
    .sidebar h1 { font-size: 18px; color: #00d4ff; margin-bottom: 4px; }
    .sidebar .version { font-size: 12px; color: #8b949e; margin-bottom: 24px; }
    .sidebar .timestamp { font-size: 11px; color: #8b949e; margin-bottom: 24px; }

    /* Summary cards */
    .summary-cards { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .card { padding: 12px; border-radius: 8px; background: #161b22; border: 1px solid #21262d; }
    .card .label { font-size: 11px; text-transform: uppercase; color: #8b949e; letter-spacing: 0.5px; }
    .card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .card.total .value { color: #e6edf3; }
    .card.changed .value { color: #f85149; }
    .card.new .value { color: #f0883e; }
    .card.passed .value { color: #3fb950; }

    /* Nav */
    .nav { list-style: none; margin-bottom: 24px; }
    .nav li { margin-bottom: 2px; }
    .nav a { display: block; padding: 8px 12px; border-radius: 6px; color: #8b949e; text-decoration: none; font-size: 13px; transition: all 0.15s; }
    .nav a:hover { background: #161b22; color: #e6edf3; }
    .nav a .count { float: right; background: #21262d; padding: 2px 8px; border-radius: 10px; font-size: 11px; }

    /* CTA */
    .cta { background: linear-gradient(135deg, #0d419d 0%, #1158d9 100%); padding: 16px; border-radius: 8px; margin-top: auto; }
    .cta h3 { font-size: 13px; color: #fff; margin-bottom: 6px; }
    .cta p { font-size: 11px; color: #a5d6ff; line-height: 1.5; }
    .cta a { display: inline-block; margin-top: 8px; padding: 6px 14px; background: #00d4ff; color: #08111f; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; }

    /* Main content */
    .main { margin-left: 260px; flex: 1; padding: 32px; }
    .section { margin-bottom: 48px; }
    .section-title { font-size: 20px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #21262d; }
    .section-title.changed { color: #f85149; }
    .section-title.new { color: #f0883e; }
    .section-title.passed { color: #3fb950; }

    /* Snapshot card */
    .snapshot { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .snapshot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .snapshot-name { font-size: 16px; font-weight: 600; }
    .snapshot-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-changed { background: #f8514922; color: #f85149; }
    .badge-new { background: #f0883e22; color: #f0883e; }
    .badge-passed { background: #3fb95022; color: #3fb950; }
    .snapshot-stats { font-size: 12px; color: #8b949e; margin-bottom: 16px; }

    /* 3-column diff view */
    .diff-view { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .diff-view.two-col { grid-template-columns: 1fr 1fr; }
    .diff-view.one-col { grid-template-columns: 1fr; }
    .diff-col { text-align: center; }
    .diff-col label { display: block; font-size: 11px; color: #8b949e; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
    .diff-col img { max-width: 100%; border-radius: 6px; border: 1px solid #21262d; cursor: zoom-in; transition: transform 0.2s; }
    .diff-col img:hover { transform: scale(1.02); }

    /* Approve command */
    .approve-cmd { margin-top: 16px; background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .approve-cmd code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; color: #00d4ff; }
    .approve-cmd button { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.15s; }
    .approve-cmd button:hover { background: #30363d; }
    .approve-cmd button.copied { background: #3fb950; color: #0d1117; }

    /* Zoom overlay */
    .zoom-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 100; justify-content: center; align-items: center; cursor: zoom-out; }
    .zoom-overlay.active { display: flex; }
    .zoom-overlay img { max-width: 95%; max-height: 95%; border-radius: 8px; }

    /* Empty state */
    .empty { text-align: center; padding: 48px; color: #8b949e; }
    .empty .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <aside class="sidebar">
    <h1>TestivAI</h1>
    <div class="version">Visual Report v${escapeHtml(version)}</div>
    <div class="timestamp">${escapeHtml(new Date(timestamp).toLocaleString())}</div>

    <div class="summary-cards">
      <div class="card total"><div class="label">Total</div><div class="value">${summary.total}</div></div>
      <div class="card changed"><div class="label">Changed</div><div class="value">${summary.changed}</div></div>
      <div class="card new"><div class="label">New</div><div class="value">${summary.newSnapshots}</div></div>
      <div class="card passed"><div class="label">Passed</div><div class="value">${summary.passed}</div></div>
    </div>

    <ul class="nav">
      ${summary.changed > 0 ? `<li><a href="#changed">Changed <span class="count">${summary.changed}</span></a></li>` : ''}
      ${summary.newSnapshots > 0 ? `<li><a href="#new">New <span class="count">${summary.newSnapshots}</span></a></li>` : ''}
      ${summary.passed > 0 ? `<li><a href="#passed">Passed <span class="count">${summary.passed}</span></a></li>` : ''}
    </ul>

    <div class="cta">
      <h3>Need AI-powered analysis?</h3>
      <p>TestivAI Cloud adds smart matching, AI verdicts, and team collaboration.</p>
      <a href="https://testiv.ai" target="_blank">Learn More</a>
    </div>
  </aside>

  <main class="main">
    ${summary.total === 0 ? `
    <div class="empty">
      <div class="icon">📸</div>
      <h2>No snapshots found</h2>
      <p>Run your tests to generate visual snapshots.</p>
    </div>` : ''}

    ${changed.length > 0 ? `
    <section class="section" id="changed">
      <h2 class="section-title changed">Changed (${changed.length})</h2>
      ${changed.map((s) => renderSnapshot(s)).join('\n')}
    </section>` : ''}

    ${newSnapshots.length > 0 ? `
    <section class="section" id="new">
      <h2 class="section-title new">New (${newSnapshots.length})</h2>
      ${newSnapshots.map((s) => renderSnapshot(s)).join('\n')}
    </section>` : ''}

    ${passed.length > 0 ? `
    <section class="section" id="passed">
      <h2 class="section-title passed">Passed (${passed.length})</h2>
      ${passed.map((s) => renderSnapshot(s)).join('\n')}
    </section>` : ''}
  </main>

  <div class="zoom-overlay" id="zoomOverlay">
    <img id="zoomImage" src="" alt="Zoomed">
  </div>

  <script>
    // Image zoom
    document.querySelectorAll('.diff-col img').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('zoomImage').src = img.src;
        document.getElementById('zoomOverlay').classList.add('active');
      });
    });
    document.getElementById('zoomOverlay').addEventListener('click', () => {
      document.getElementById('zoomOverlay').classList.remove('active');
    });

    // Copy approve command
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        navigator.clipboard.writeText(cmd).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  </script>
</body>
</html>`;
}

function renderSnapshot(snapshot: SnapshotResult): string {
  const badgeClass = snapshot.status === 'changed' ? 'badge-changed' : snapshot.status === 'new' ? 'badge-new' : 'badge-passed';

  const hasBaseline = !!snapshot.baselinePath;
  const hasDiff = !!snapshot.diffPath;
  const hasCurrent = !!snapshot.currentPath;

  let gridClass = 'diff-view';
  if (hasBaseline && hasDiff && hasCurrent) gridClass += '';
  else if (hasCurrent && !hasBaseline) gridClass += ' one-col';
  else gridClass += ' two-col';

  return `
    <div class="snapshot">
      <div class="snapshot-header">
        <span class="snapshot-name">${escapeHtml(snapshot.name)}</span>
        <span class="snapshot-badge ${badgeClass}">${snapshot.status}</span>
      </div>
      ${snapshot.status === 'changed' ? `<div class="snapshot-stats">Diff: ${snapshot.diffPercent.toFixed(2)}% (${snapshot.diffCount} pixels)</div>` : ''}
      <div class="${gridClass}">
        ${hasBaseline ? `<div class="diff-col"><label>Baseline</label><img src="${snapshot.baselinePath}" alt="Baseline"></div>` : ''}
        ${hasDiff ? `<div class="diff-col"><label>Diff</label><img src="${snapshot.diffPath}" alt="Diff"></div>` : ''}
        ${hasCurrent ? `<div class="diff-col"><label>Current</label><img src="${snapshot.currentPath}" alt="Current"></div>` : ''}
      </div>
      ${snapshot.status === 'changed' || snapshot.status === 'new' ? `
      <div class="approve-cmd">
        <code>npx testivai approve ${escapeHtml(snapshot.name)}</code>
        <button class="copy-btn" data-cmd="npx testivai approve ${escapeHtml(snapshot.name)}">Copy</button>
      </div>` : ''}
    </div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
