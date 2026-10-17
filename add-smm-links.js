const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');

const banner = `
  <div id="smm-ad-campaign-bar" style="background:#0f172a;color:#f8fafc;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid #334155;z-index:9999;position:relative;">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="background:#22c55e;color:#052e16;font-size:10px;font-weight:700;letter-spacing:0.08em;padding:3px 8px;border-radius:4px;text-transform:uppercase;">● Live Campaigns Active</span>
      <span style="color:#94a3b8;">SMM Ad Shareable Preview &amp; Inspiration Notification — Active through <strong style="color:#f1f5f9;">October 30, 2026</strong></span>
    </div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <a href="https://fb.me/2dQlXufp1cr05g6" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:#38bdf8;text-decoration:none;font-weight:600;padding:6px 14px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.35);border-radius:6px;transition:all 0.2s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <span>Preview All Running Ads (Shareable Link)</span>
      </a>
      <a href="https://www.facebook.com/ads/library/?id=1733728674591526" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:#cbd5e1;text-decoration:none;font-weight:500;padding:6px 14px;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.25);border-radius:6px;transition:all 0.2s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        <span>Meta Ads Library #1733728674591526</span>
      </a>
    </div>
  </div>
`;

if (html.includes('<!-- End of bodyStart -->')) {
  html = html.replace('<!-- End of bodyStart -->', banner + '\n\t<!-- End of bodyStart -->');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log('Successfully injected SMM ad notification bar.');
} else {
  console.error('bodyStart comment not found.');
}
