// scripts/readme_to_html.mjs
import fs from "fs/promises";
import { marked } from "marked";

const README = "README.md";
const OUT = "index.html";

// (tuỳ chọn) cắt bớt section khi build web
function stripSections(md) {
  // Bỏ mục Recent Activity nếu có (tuỳ chọn)
  return md.replace(/## 🧷[\s\S]*?<!--RECENT_ACTIVITY:END-->/, "");
}

// Trích một section theo tiêu đề cấp 2
function extractSection(md, headingRegex) {
  const pattern = new RegExp(`(^|\n)## +.*${headingRegex}.*\n[\\s\\S]*?(?=\n## |$)`, 'i');
  const m = md.match(pattern);
  return m ? m[0] : null;
}

function removeSection(md, headingRegex) {
  return md.replace(new RegExp(`(^|\n)## +.*${headingRegex}.*\n[\\s\\S]*?(?=\n## |$)`, 'i'), '\n');
}

function buildTOC(html) {
  const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(m => m[1].replace(/<.*?>/g,''));
  if (!h2.length) return '';
  return '<ul>' + h2.map(t => {
    const id = t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$|--+/g,'');
    return `<li><a href="#${id}">${t}</a></li>`;
  }).join('') + '</ul>';
}

function injectHeadingIds(html){
  return html.replace(/<h(\d)>(.*?)<\/h\1>/g,(m,l,inner)=>{
    const id = inner.replace(/<.*?>/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$|--+/g,'');
    return `<h${l} id="${id}">${inner}</h${l}>`;
  });
}

function buildJSONLD(profile) {
  return JSON.stringify({
    '@context':'https://schema.org',
    '@type':'Person',
    name: profile.name,
    jobTitle: profile.tagline,
    url: 'https://thientrile.github.io',
    email: 'mailto:thientrile2003@gmail.com'
  });
}

// Biến bảng Projects thành card grid
function transformProjects(html){
  const startMarker='<!--FEATURED_PROJECTS:START-->';
  const endMarker='<!--FEATURED_PROJECTS:END-->';
  const s=html.indexOf(startMarker);
  const e=html.indexOf(endMarker, s+startMarker.length);
  if(s===-1||e===-1) return html;
  const block=html.slice(s,e+endMarker.length);
  const tableMatch=block.match(/<table>[\s\S]*?<\/table>/i);
  if(!tableMatch) return html;
  const tableHtml=tableMatch[0];
  const rowsHtml=(tableHtml.match(/<tr>[\s\S]*?<\/tr>/g)||[]).slice(1); // bỏ header
  if(!rowsHtml.length) return html;
  const langSlug = (lang)=>{
    if(!lang) return null;
    const map = {
      'javascript':'javascript/javascript-original.svg',
      'typescript':'typescript/typescript-original.svg',
      'node.js':'nodejs/nodejs-original.svg',
      'nodejs':'nodejs/nodejs-original.svg',
      'go':'go/go-original.svg',
      'golang':'go/go-original.svg',
      'php':'php/php-original.svg',
      'html':'html5/html5-original.svg',
      'html5':'html5/html5-original.svg',
      'css':'css3/css3-original.svg',
      'vue':'vuejs/vuejs-original.svg',
      'vuejs':'vuejs/vuejs-original.svg',
      'mongodb':'mongodb/mongodb-original.svg',
      'mysql':'mysql/mysql-original.svg',
      'redis':'redis/redis-original.svg'
    };
    const key = lang.toLowerCase();
    return map[key] || null;
  };
  const iconUrl = (lang)=>{
    const slug = langSlug(lang);
    if(!slug) return null;
    return `https://cdn.jsdelivr.net/npm/devicon@latest/icons/${slug}`;
  };
  const cards=rowsHtml.map(r=>{
    const cells=[...r.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m=>m[1].trim());
    if(cells.length<5) return '';
    const project=cells[0];
    const tech=cells[1];
    const stars=cells[2];
    const updated=cells[3];
    const desc=cells[4];
    const nameMatch=project.match(/\[(.*?)\]/); // fallback
    const rawName=nameMatch?nameMatch[1]:project.replace(/<.*?>/g,'');
    const linkMatch=project.match(/href="(.*?)"/);
    const href=linkMatch?linkMatch[1]:'';
    const isPrivate = /\(\s*private\s*\)|🔒/i.test(project) || !href;
    const displayName = rawName.replace(/\s*\(\s*private\s*\)\s*|🔒/ig,'').trim();
    const cleanDesc=desc.replace(/<.*?>/g,'');
    const langIcon = iconUrl(tech?.split(/[,/]|\s+/)[0]);
    const iconTag = langIcon ? `<img class=\"project-icon\" src=\"${langIcon}\" alt=\"${tech}\" loading=\"lazy\" width=\"20\" height=\"20\"/>` : '';
    // Only place one data-reveal attribute on outer card; inner h3 left clean to avoid duplication logic later
    const titleInner = isPrivate
      ? `${iconTag}<span>${displayName}</span>`
      : `${iconTag}<a href="${href}" target="_blank" rel="noopener">${displayName}</a>`;
    const privatePill = isPrivate ? `<span class="pill pill-private">Private</span>` : '';
    return `<div class="project-card" data-reveal>`+
      `<h3 class="project-title">${titleInner}</h3>`+
      `<div class="project-meta">${privatePill}${tech?`<span class="pill pill-lang">${tech}</span>`:''}${stars?`<span class="pill pill-star">★ ${stars}</span>`:''}${updated?`<span class="pill pill-date">${updated}</span>`:''}</div>`+
      (cleanDesc?`<p class="project-desc">${cleanDesc}</p>`:'')+
    `</div>`;
  }).join('');
  // Don't nest markers inside existing marker block; keep only outer markers
  const grid=`<div class="projects-grid">${cards}</div>`;
  const newBlock=block.replace(tableHtml, grid);
  return html.slice(0,s)+newBlock+html.slice(e+endMarker.length);
}

// Wrap and style timeline content
function enhanceTimeline(html){
  const start='<!--TIMELINE:START-->';
  const end='<!--TIMELINE:END-->';
  const si=html.indexOf(start);
  const ei=html.indexOf(end, si+start.length);
  if(si===-1||ei===-1) return html;
  let block=html.slice(si+start.length, ei); // inner
  // Add wrapper div if not present
  if(!/class="timeline"/.test(block)){
    block = `\n<div class="timeline">${block}\n</div>\n`;
  }
  // Inject emoji span + type class
  const typeMap = { '🎓':'education','🧩':'education','📦':'repo','🔒':'work','📄':'case'};
  block = block.replace(/<li([^>]*)>([^<]{1,6})\s+/g,(m,attrs,lead)=>{
    const emoji = lead.trim();
    const t = typeMap[emoji]||'other';
    // avoid double wrapping
    if(/class=/.test(attrs)){ attrs = attrs.replace(/class=("|')(.*?)(\1)/, (mm,q,c)=>`class=${q}${c} tl-item type-${t}${q}`); }
    else attrs += ` class=\"tl-item type-${t}\"`;
    return `<li${attrs}><span class="tl-emoji">${emoji}</span> `;
  });
  return html.slice(0,si+start.length)+block+html.slice(ei);
}

function htmlShell({ bodyHtml, sidebarHtml, tocHtml, jsonld, meta }) {
  // Inject data-reveal attributes for simple reveal targets
  let enhancedBody = bodyHtml
    // only add if not already containing data-reveal
    .replace(/<h2(?![^>]*data-reveal)/g,'<h2 data-reveal')
    // skip h3 auto-reveal to avoid duplication inside project cards
    .replace(/<p(?![^>]*data-reveal)>/g,'<p data-reveal>')
    .replace(/<li(?![^>]*data-reveal)>/g,'<li data-reveal>');
  // Gán kiểu animation luân phiên & order cho stagger
  const types = ['fade-up','fade-left','fade-right','scale','rise'];
  let revealIndex = -1;
  // Only add reveal metadata if tag doesn't already contain a data-reveal-type attribute
  // Only target standalone data-reveal attributes, not the substring inside data-reveal-type
  enhancedBody = enhancedBody.replace(/\bdata-reveal\b(?![^>]*data-reveal-type)/g, () => {
    revealIndex++;
    const t = types[revealIndex % types.length];
    return `data-reveal data-reveal-type="${t}" data-reveal-order="${revealIndex}"`;
  });
  // Chuẩn bị top tab nav từ tocHtml
  let topTabsHtml = tocHtml
    .replace('<ul>','')
    .replace('</ul>','')
    .replace(/<li>/g,'')
    .replace(/<\/li>/g,'');
  // Append CV action buttons (PDF / Print) into top tabs (không thêm section CV Online nữa)
  // Wrap anchors in scroll container; keep buttons fixed on right
  // Add menu button (hamburger) for collapsing tabs on small screens; Download CV stays visible
  topTabsHtml = `<div class=\"tabs-scroll\" id=\"tabs-scroll\">${topTabsHtml}</div><div class=\"cv-fixed-btns\"><button id=\"tabs-menu-btn\" class=\"cv-btn\" type=\"button\" aria-haspopup=\"true\" aria-expanded=\"false\" aria-controls=\"tabs-menu-panel\">☰ Menu</button><button id=\"cv-pdf-btn\" class=\"cv-btn primary\" type=\"button\">⬇️ Download CV</button></div><div id=\"tabs-menu-panel\" class=\"tabs-menu-panel\" hidden></div>`;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}"/>
<meta property="og:title" content="${meta.title}"/>
<meta property="og:description" content="${meta.desc}"/>
<meta property="og:type" content="profile"/>
<link rel="icon" href="https://avatars.githubusercontent.com/u/0?v=4" id="dynamic-favicon"/>
<link rel="preconnect" href="https://avatars.githubusercontent.com" crossorigin>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-dark.min.css" media="(prefers-color-scheme: dark)">
<style>
.root{}
:root{--max-w:1180px;--sidebar-w:300px;--gap:24px;--ease:cubic-bezier(.4,.08,.2,1);--bg-dark:#0d1117;--accent:#2563eb;--accent-fg:#fff;--brand-start:#1d4ed8;--brand-mid:#1e40af;--brand-end:#0f296b;--bg-light:#f5f7fb;--panel-light:#ffffff;--panel-dark:#0b1220;--badge-bg:#e3eaf6;--badge-fg:#334155;--badge-dark:#1e2936;--badge-dark-fg:#cbd5e1;--panel-border:#d0d7de;--app-bg:linear-gradient(135deg,#f5f7fb 0%,#eef2f9 55%,#e6edf6 100%);--tabs-h:54px}
body{margin:0;background:var(--app-bg);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#24292f;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden}
html{scroll-behavior:smooth}
@media (prefers-color-scheme: dark){:root{--app-bg:linear-gradient(135deg,#0d1117 0%,#0c1624 55%,#09101b 100%)}body{background:var(--app-bg);color:#e6edf3}}
/* Forced theme overrides (attribute wins over media query) */
html[data-theme="dark"]{--app-bg:linear-gradient(135deg,#0d1117 0%,#0c1624 55%,#09101b 100%);}
html[data-theme="dark"] body{background:var(--app-bg);color:#e6edf3}
html[data-theme="light"]{--app-bg:linear-gradient(135deg,#f5f7fb 0%,#eef2f9 55%,#e6edf6 100%);}
/* Component dark variants when forced */
@media (prefers-color-scheme: dark){.sidebar{ } }
html[data-theme="dark"] .sidebar{background:var(--panel-dark);box-shadow:0 4px 14px -4px rgba(0,0,0,.6),0 1px 0 0 rgba(255,255,255,.04) inset}
html[data-theme="dark"] .panel{background:var(--panel-dark);box-shadow:0 3px 10px -3px rgba(0,0,0,.65)}
html[data-theme="dark"] .top-tabs{background:rgba(13,17,23,.78);border-bottom:1px solid rgba(255,255,255,.08)}
html[data-theme="dark"] .top-tabs a{color:#cbd5e1;background:rgba(255,255,255,.06)}
html[data-theme="dark"] .badge{background:var(--badge-dark);color:var(--badge-dark-fg)}
html[data-theme="dark"] .pill{background:var(--badge-dark);color:var(--badge-dark-fg)}
html[data-theme="dark"] .project-card{background:var(--panel-dark);border:1px solid rgba(255,255,255,.06);box-shadow:0 4px 14px -4px rgba(0,0,0,.65),0 1px 0 rgba(255,255,255,.03) inset}
html[data-theme="dark"] .pill-star{background:#78350f;color:#fcd34d}
/* Theme toggle button */
.theme-toggle{position:fixed;right:14px;bottom:14px;z-index:1200;background:var(--panel-light);color:#334155;border:1px solid rgba(0,0,0,.12);border-radius:28px;padding:10px 14px;font-size:.8rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 4px 14px -4px rgba(0,0,0,.18);transition:background .35s,var(--ease),color .35s var(--ease),transform .25s var(--ease)}
.theme-toggle:hover{background:var(--accent);color:var(--accent-fg)}
.theme-toggle:active{transform:scale(.94)}
html[data-theme="dark"] .theme-toggle{background:var(--panel-dark);color:#cbd5e1;border:1px solid rgba(255,255,255,.12);box-shadow:0 4px 14px -4px rgba(0,0,0,.65)}
html[data-theme="dark"] .theme-toggle:hover{background:var(--accent);color:var(--accent-fg)}
.intro-screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--app-bg);color:#0f172a;z-index:1000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
html[data-theme="dark"] .intro-screen{color:#fff}
.intro-screen:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 35% 35%,rgba(37,99,235,.22),rgba(30,64,175,.08),transparent 70%);mix-blend-mode:overlay;pointer-events:none}
.intro-inner{text-align:center}
/* New intro animation: text grows from small to large then fades */
.intro-text{font-size:clamp(2.4rem,6vw,5rem);font-weight:800;letter-spacing:.045em;display:inline-block;position:relative;animation:popGrow 1.55s var(--ease) forwards;line-height:.9;text-shadow:0 1px 0 #fff,0 2px 0 #e2e8f0,0 3px 1px #cbd5e1,0 5px 12px rgba(0,0,0,.18),0 8px 28px rgba(0,0,0,.12)}
/* Dark mode gets simplified cleaner shadow (old multi-layer white looked boxy on dark bg) */
html[data-theme="dark"] .intro-text{font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,.7),0 0 32px rgba(37,99,235,.25)}
.intro-text::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;background:radial-gradient(circle at 55% 40%,rgba(255,255,255,.55),rgba(255,255,255,0) 60%)}
.intro-text .word{display:inline-block}
.intro-text .accent{background:linear-gradient(92deg,var(--accent) 0%,#4f8ef7 45%,#60a5fa 70%,#8cc9ff 100%);-webkit-background-clip:text;color:transparent;text-shadow:0 1px 1px rgba(255,255,255,.5),0 3px 8px rgba(0,0,0,.15)}
html[data-theme="dark"] .intro-text .accent{background:linear-gradient(92deg,#93c5fd 0%,#60a5fa 35%,#3b82f6 70%,#1e3a8a 100%);text-shadow:0 0 22px rgba(59,130,246,.55),0 3px 10px rgba(0,0,0,.65)}
/* Dark mode 3D block effect per word */
html[data-theme="dark"] .intro-text .word{position:relative;padding:0 .22em .08em;border-radius:10px;isolation:isolate}
html[data-theme="dark"] .intro-text .word::before{content:"";position:absolute;inset:0;border-radius:10px;background:linear-gradient(140deg,rgba(255,255,255,.08),rgba(255,255,255,.025) 45%,rgba(0,0,0,.4) 100%);backdrop-filter:blur(10px) brightness(1.02);-webkit-backdrop-filter:blur(10px) brightness(1.02);box-shadow:0 5px 14px -4px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.06) inset,0 1px 0 0 rgba(255,255,255,.05) inset,0 10px 24px -6px rgba(0,0,0,.7);z-index:-1;transform:translate3d(0,4px,-1px)}
html[data-theme="dark"] .intro-text .word.accent::before{background:linear-gradient(125deg,#1d4ed8 0%,#1842b8 45%,#13378f 70%,#0d275d 100%);box-shadow:0 6px 20px -4px rgba(29,78,216,.65),0 0 0 1px rgba(255,255,255,.08) inset,0 1px 0 0 rgba(255,255,255,.06) inset,0 12px 30px -6px rgba(12,54,120,.75)}
html[data-theme="dark"] .intro-text .word.accent{background:transparent;-webkit-background-clip:unset;color:#dbe9ff}
/* Layered text-shadow to simulate extrusion (dimmed) */
html[data-theme="dark"] .intro-text .word{text-shadow:0 1px 0 rgba(255,255,255,.32),0 2px 0 rgba(255,255,255,.25),0 3px 0 rgba(255,255,255,.18),0 4px 6px rgba(0,0,0,.55),0 7px 18px rgba(0,0,0,.7)}
html[data-theme="dark"] .intro-text .word.accent{text-shadow:0 1px 0 rgba(255,255,255,.28),0 2px 0 rgba(255,255,255,.22),0 3px 0 rgba(255,255,255,.18),0 4px 8px rgba(29,78,216,.55),0 9px 22px rgba(12,54,120,.7)}
body.intro-done .intro-screen{opacity:0;pointer-events:none;transition:opacity .55s ease .05s}
body.preload .layout{opacity:0;transform:translateY(12px)}
body.ready .layout{opacity:1;transform:none;transition:opacity .6s var(--ease) .15s, transform .6s var(--ease) .15s}
@keyframes popGrow{0%{opacity:0;transform:scale(.25)}40%{opacity:1;transform:scale(.98)}70%{opacity:1;transform:scale(1.03)}85%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.08)}}
@keyframes fadeUp{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
/* Scroll reveal */
[data-reveal]{opacity:0;will-change:transform,opacity;transition:opacity .85s var(--ease),transform .85s var(--ease),filter .85s var(--ease);filter:blur(2px)}
[data-reveal][data-reveal-type="fade-up"]{transform:translateY(28px)}
[data-reveal][data-reveal-type="fade-left"]{transform:translateX(40px)}
[data-reveal][data-reveal-type="fade-right"]{transform:translateX(-40px)}
[data-reveal][data-reveal-type="scale"]{transform:scale(.92);transform-origin:50% 60%}
[data-reveal][data-reveal-type="rise"]{transform:translateY(48px) scale(.97);opacity:.001}
[data-reveal].reveal-in{opacity:1;transform:none;filter:blur(0)}
[data-reveal].reveal-in[data-reveal-type="scale"]{transform:scale(1)}
[data-reveal].reveal-in[data-reveal-type="rise"]{transform:translateY(0) scale(1)}
@media (prefers-reduced-motion: reduce){.intro-text .word,[data-reveal]{animation:none;transition:none;opacity:1;transform:none}}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline;text-decoration-color:var(--accent)}
.layout{max-width:var(--max-w);margin:32px auto;padding:0 20px;display:grid;grid-template-columns:var(--sidebar-w) 1fr;gap:var(--gap)}
@media (max-width:960px){.layout{display:block}}
.sidebar{background:var(--panel-light);border-radius:14px;padding:22px 20px 26px;position:sticky;top:calc(var(--tabs-h) + 16px);align-self:start;box-shadow:0 4px 14px -4px rgba(0,0,0,.12),0 1px 0 0 rgba(255,255,255,.4) inset}
@media (prefers-color-scheme: dark){.sidebar{background:var(--panel-dark);box-shadow:0 4px 14px -4px rgba(0,0,0,.6),0 1px 0 0 rgba(255,255,255,.04) inset}}
.sidebar h1{margin-top:0;font-size:1.5rem;text-align:center}
.tagline{font-size:.9rem;opacity:.8;margin-top:-6px;margin-bottom:12px;text-align:center}
.contact a{display:block;margin:.25rem 0;font-size:.85rem;overflow:hidden;text-overflow:ellipsis}
.main{min-width:0}
.panel{background:var(--panel-light);border-radius:14px;padding:30px 32px;margin-bottom:26px;box-shadow:0 3px 10px -3px rgba(0,0,0,.12)}
@media (prefers-color-scheme: dark){.panel{background:var(--panel-dark);box-shadow:0 3px 10px -3px rgba(0,0,0,.65)}}
.panel h2:first-child{margin-top:0}
nav.toc{font-size:.8rem;margin-top:16px}
nav.toc ul{list-style:none;padding-left:0;margin:0}nav.toc li{margin:4px 0}
code{font-family:ui-monospace,monospace;font-size:.85em}
h2[id]{scroll-margin-top:calc(var(--tabs-h) + 28px)}
/* Top Tabs */
.top-tabs{position:sticky;top:0;z-index:1400;backdrop-filter:saturate(180%) blur(14px);background:rgba(255,255,255,.78);border-bottom:1px solid rgba(0,0,0,.06);padding:6px 12px;display:flex;align-items:center;gap:8px;min-height:var(--tabs-h)}
.tabs-scroll{display:flex;gap:4px;flex:1 1 auto;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.tabs-scroll::-webkit-scrollbar{display:none}
.cv-fixed-btns{display:flex;gap:6px;flex:0 0 auto}
@media (prefers-color-scheme: dark){.top-tabs{background:rgba(13,17,23,.78);border-bottom:1px solid rgba(255,255,255,.08)}}
.top-tabs a{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:8px 12px;border-radius:22px;position:relative;display:inline-flex;align-items:center;line-height:1;color:#334155;background:rgba(0,0,0,.04);text-decoration:none;flex:0 0 auto;transition:background .35s var(--ease),color .35s var(--ease)}
@media (prefers-color-scheme: dark){.top-tabs a{color:#cbd5e1;background:rgba(255,255,255,.06)}}
.top-tabs a:hover{background:var(--accent);color:var(--accent-fg)}
.top-tabs a.active{background:linear-gradient(90deg,var(--accent),#4f8ef7);color:var(--accent-fg);box-shadow:0 0 0 1px rgba(255,255,255,.4) inset}
.top-tabs-spacer{flex:1 1 auto}
.cv-btn{flex:0 0 auto;background:var(--badge-bg);color:var(--badge-fg);border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:22px;font-size:.62rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:background .35s var(--ease),color .35s var(--ease),transform .25s var(--ease);display:inline-flex;align-items:center;gap:4px}
.cv-btn.primary{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}
.cv-btn:hover{background:var(--accent);color:var(--accent-fg)}
.cv-btn:active{transform:scale(.94)}
@media (prefers-color-scheme: dark){.cv-btn{background:var(--badge-dark);color:var(--badge-dark-fg);border:1px solid rgba(255,255,255,.12)}.cv-btn.primary{background:var(--accent);color:var(--accent-fg)} }
.top-tabs-fade{pointer-events:none;position:absolute;top:0;bottom:0;width:48px}
.top-tabs-fade.left{left:0;background:linear-gradient(90deg,var(--app-bg),rgba(255,255,255,0))}
@media (prefers-color-scheme: dark){.top-tabs-fade.left{background:linear-gradient(90deg,rgba(13,17,23,1),rgba(13,17,23,0))}}
.top-tabs-fade.right{right:0;background:linear-gradient(270deg,var(--app-bg),rgba(255,255,255,0))}
@media (prefers-color-scheme: dark){.top-tabs-fade.right{background:linear-gradient(270deg,rgba(13,17,23,1),rgba(13,17,23,0))}}
@media print{body{background:#fff}.sidebar,nav.toc{position:static;box-shadow:none}.panel{box-shadow:none;border:1px solid #ddd;page-break-inside:avoid;break-inside:avoid}a{text-decoration:none}.layout{display:block;max-width:1000px}.top-tabs,#theme-toggle,.theme-toggle{display:none !important}.cv-actions{display:none !important}.intro-screen{display:none !important}h2{break-after:avoid-page;page-break-after:avoid;orphans:3;widows:3}h2:not(:first-of-type){margin-top:48px} .projects-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));page-break-inside:avoid;break-inside:avoid} .project-card{page-break-inside:avoid;break-inside:avoid;border:1px solid #bbb !important} .timeline .tl-item{page-break-inside:avoid;break-inside:avoid} }
/* Hide elements (hero, buttons, intro) during export (PDF capture) */
body.exporting .top-tabs,body.exporting #theme-toggle,body.exporting .theme-toggle,body.exporting .cv-btn,body.exporting .intro-screen,body.exporting .hero-export-hide{display:none !important}
/* Hide dates when exporting (print/PDF) */
body.exporting .pill-date,body.exporting .tl-date{display:none !important}
@media print {.hero-export-hide{display:none !important}}
.badge{display:inline-block;background:var(--badge-bg);color:var(--badge-fg);padding:4px 10px 3px;border-radius:18px;font-size:.63rem;font-weight:600;margin:0 6px 6px 0;letter-spacing:.5px;text-transform:uppercase;transition:.25s background var(--ease), .25s color var(--ease)}
@media (prefers-color-scheme: dark){.badge{background:var(--badge-dark);color:var(--badge-dark-fg)}}
.badge:hover{background:var(--accent);color:var(--accent-fg)}
/* Projects grid */
.projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px;margin:18px 0 34px}
.project-card{background:var(--panel-light);border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:18px 18px 20px;position:relative;box-shadow:0 4px 14px -4px rgba(0,0,0,.08),0 1px 0 rgba(255,255,255,.4) inset;display:flex;flex-direction:column}
@media (prefers-color-scheme: dark){.project-card{background:var(--panel-dark);border:1px solid rgba(255,255,255,.06);box-shadow:0 4px 14px -4px rgba(0,0,0,.65),0 1px 0 rgba(255,255,255,.03) inset}}
.project-title{margin:0 0 8px;font-size:1.05rem;line-height:1.25}
.project-title .project-icon, .project-title img.project-icon{vertical-align:middle;margin-right:6px;transform:translateY(-1px);filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}
.project-title a{text-decoration:none;color:inherit}
.project-title a:hover{color:var(--accent)}
.project-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.pill{background:var(--badge-bg);color:var(--badge-fg);padding:4px 8px 3px;border-radius:14px;display:inline-flex;align-items:center;gap:4px}
@media (prefers-color-scheme: dark){.pill{background:var(--badge-dark);color:var(--badge-dark-fg)}}
.pill-star{background:#fcd34d;color:#78350f}
@media (prefers-color-scheme: dark){.pill-star{background:#78350f;color:#fcd34d}}
.pill-private{background:#e2e8f0;color:#0f172a}
@media (prefers-color-scheme: dark){.pill-private{background:#334155;color:#e2e8f0}}
.project-desc{margin:0;font-size:.8rem;line-height:1.3;opacity:.85}
/* Project card hover overlay */
.project-card{overflow:hidden}
.project-card .project-desc{transition:opacity .35s var(--ease),transform .4s var(--ease)}
.project-card:hover .project-desc{opacity:1;transform:none}
.project-card .project-desc{opacity:.0;transform:translateY(6px)}
.project-card:hover{box-shadow:0 6px 18px -6px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05) inset}
/* Responsive tweaks */
@media (max-width:860px){
  .layout{display:block;padding:0 14px;margin:16px auto}
  .sidebar{position:static;width:auto;top:auto;margin-bottom:24px;padding:20px 18px}
  .panel{padding:24px 22px;margin-bottom:20px}
  .projects-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
  .top-tabs a{padding:7px 10px;font-size:.7rem}
  .cv-btn{padding:7px 10px;font-size:.55rem}
}
@media (max-width:520px){
  .projects-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
  .project-title{font-size:.95rem}
  .panel{padding:22px 18px}
  h2{font-size:1.15rem}
  .timeline .tl-item{padding:12px 14px 12px 48px}
  .timeline h3{padding-left:40px}
  .tl-emoji{left:12px;top:12px}
}
/* Ultra small: convert top tabs to vertical list */
@media (max-width:520px){
  .top-tabs{flex-direction:column;align-items:stretch;gap:10px;padding:10px 12px}
  .tabs-scroll{flex-direction:column;overflow-x:visible;overflow-y:auto;max-height:58vh;gap:6px}
  .top-tabs a{display:block;width:100%;text-align:left}
  .cv-fixed-btns{order:2;align-self:stretch;justify-content:flex-start}
}
/* Top tabs overflow enhancements */
.top-tabs{position:sticky;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.top-tabs.is-overflow:before,.top-tabs.is-overflow:after{content:"";position:absolute;top:0;bottom:0;width:42px;z-index:20;pointer-events:none;transition:opacity .35s var(--ease);} 
.top-tabs.is-overflow:before{left:0;background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(255,255,255,0));}
.top-tabs.is-overflow:after{right:0;background:linear-gradient(270deg,rgba(255,255,255,.9),rgba(255,255,255,0));}
html[data-theme="dark"] .top-tabs.is-overflow:before{background:linear-gradient(90deg,rgba(13,17,23,.9),rgba(13,17,23,0));}
html[data-theme="dark"] .top-tabs.is-overflow:after{background:linear-gradient(270deg,rgba(13,17,23,.9),rgba(13,17,23,0));}
.top-tabs.dragging{cursor:grabbing}
@media (max-width:600px){
  .top-tabs{justify-content:flex-start;padding:6px 8px;gap:6px}
  .top-tabs a{font-size:.62rem;padding:6px 10px}
  .cv-btn{font-size:.52rem;padding:6px 10px}
}
/* Collapsible tabs (mobile) */
@media (max-width:520px){
  .top-tabs{gap:10px}
  .top-tabs .tabs-scroll{display:none}
  .top-tabs.menu-open .tabs-scroll{display:none}
  .tabs-menu-panel{display:block;position:absolute;top:100%;left:0;right:0;background:var(--panel-light);border-bottom-left-radius:14px;border-bottom-right-radius:14px;box-shadow:0 8px 20px -6px rgba(0,0,0,.25);padding:10px 12px 14px;z-index:1399;max-height:65vh;overflow:auto}
  html[data-theme="dark"] .tabs-menu-panel{background:var(--panel-dark)}
  .tabs-menu-panel a{display:block;margin:4px 0;background:rgba(0,0,0,.05);padding:10px 12px;border-radius:12px;font-size:.7rem}
  html[data-theme="dark"] .tabs-menu-panel a{background:rgba(255,255,255,.07)}
  .top-tabs.menu-open .tabs-menu-panel[hidden]{display:block}
}
/* Menu button visibility: hidden by default unless overflow or mobile */
.cv-fixed-btns #tabs-menu-btn{display:none}
.top-tabs.is-overflow #tabs-menu-btn{display:inline-flex}
/* When in overflow mode hide the horizontal tabs list entirely (show only Menu + Download CV) */
.top-tabs.is-overflow .tabs-scroll{display:none}
@media (max-width:520px){.cv-fixed-btns #tabs-menu-btn{display:inline-flex}}
/* Active link styling inside dropdown */
.tabs-menu-panel a.active{background:var(--accent);color:var(--accent-fg)}
html[data-theme="dark"] .tabs-menu-panel a.active{background:var(--accent);color:var(--accent-fg)}
/* Dropdown animation */
.tabs-menu-panel{animation:menuDrop .35s var(--ease)}
@keyframes menuDrop{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}
/* Global menu panel styling (desktop + mobile). Previously only styled under 520px causing layout bug on larger screens */
.tabs-menu-panel{position:absolute;top:100%;left:0;background:var(--panel-light);border-radius:14px;box-shadow:0 8px 20px -6px rgba(0,0,0,.25);padding:10px 12px 14px;z-index:1399;max-height:65vh;overflow:auto;min-width:240px}
html[data-theme="dark"] .tabs-menu-panel{background:var(--panel-dark)}
.tabs-menu-panel[hidden]{display:none !important}
/* When menu open (any viewport) hide horizontal scroll list to avoid duplicate links */
.top-tabs.menu-open .tabs-scroll{display:none}
@media (max-width:520px){
  /* Mobile: stretch panel full width & remove corner rounding at top so it fuses with nav */
  .tabs-menu-panel{left:0;right:0;border-bottom-left-radius:14px;border-bottom-right-radius:14px;min-width:0}
}
/* CV buttons */
.cv-actions{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 24px}
.btn{background:var(--badge-bg);color:var(--badge-fg);border:1px solid rgba(0,0,0,.08);padding:10px 16px;border-radius:10px;font-size:.75rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:.3s background var(--ease),.3s color var(--ease),.25s transform var(--ease)}
@media (prefers-color-scheme: dark){.btn{background:var(--badge-dark);color:var(--badge-dark-fg);border:1px solid rgba(255,255,255,.08)}}
.btn-primary{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(0)}
/* Timeline styled */
.timeline{position:relative;margin:12px 0 40px;padding-left:6px}
.timeline:before{content:"";position:absolute;left:18px;top:0;bottom:0;width:3px;background:linear-gradient(var(--accent),rgba(0,0,0,0))}
.timeline h3{margin:36px 0 10px;font-size:.8rem;letter-spacing:.6px;text-transform:uppercase;opacity:.85;position:relative;padding-left:42px}
.timeline h3:before{content:"";position:absolute;left:12px;top:50%;width:14px;height:14px;border-radius:50%;background:var(--accent);transform:translateY(-50%);box-shadow:0 0 0 4px rgba(37,99,235,.15)}
.timeline ul{list-style:none;padding:0;margin:0 0 0 0}
.timeline .tl-item{background:var(--panel-light);border:1px solid rgba(0,0,0,.07);border-radius:14px;padding:14px 16px 14px 52px;margin:0 0 14px;position:relative;box-shadow:0 3px 8px -3px rgba(0,0,0,.12);transition:background .35s var(--ease),border-color .35s var(--ease)}
@media (prefers-color-scheme: dark){.timeline .tl-item{background:var(--panel-dark);border:1px solid rgba(255,255,255,.09);box-shadow:0 3px 10px -3px rgba(0,0,0,.7)}}
.timeline .tl-item{color:inherit}
/* Forced theme attr overrides for timeline (so toggle works even if system theme khác) */
html[data-theme="dark"] .timeline .tl-item{background:var(--panel-dark);border:1px solid rgba(255,255,255,.09);box-shadow:0 3px 10px -3px rgba(0,0,0,.7)}
html[data-theme="light"] .timeline .tl-item{background:var(--panel-light);border:1px solid rgba(0,0,0,.07);box-shadow:0 3px 8px -3px rgba(0,0,0,.12)}
.timeline .tl-item:hover{border-color:var(--accent)}
.tl-emoji{position:absolute;left:14px;top:14px;font-size:20px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
.timeline .type-education{border-left:4px solid #16a34a}
.timeline .type-repo{border-left:4px solid #2563eb}
.timeline .type-work{border-left:4px solid #d97706}
.timeline .type-case{border-left:4px solid #7c3aed}
.timeline .type-other{border-left:4px solid #64748b}
@media (prefers-color-scheme: dark){
  .timeline .type-education{border-left-color:#22c55e}
  .timeline .type-repo{border-left-color:#3b82f6}
  .timeline .type-work{border-left-color:#f59e0b}
  .timeline .type-case{border-left-color:#8b5cf6}
  .timeline .type-other{border-left-color:#94a3b8}
}
html[data-theme="dark"] .timeline .type-education{border-left-color:#22c55e}
html[data-theme="dark"] .timeline .type-repo{border-left-color:#3b82f6}
html[data-theme="dark"] .timeline .type-work{border-left-color:#f59e0b}
html[data-theme="dark"] .timeline .type-case{border-left-color:#8b5cf6}
html[data-theme="dark"] .timeline .type-other{border-left-color:#94a3b8}
@media print{.timeline:before{display:none}.timeline .tl-item{box-shadow:none}}
@media print{.projects-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.project-card{box-shadow:none;border:1px solid #ccc}}
/* --- Dark intro refined (match light 3D aesthetic) overrides placed last to win specificity --- */
html[data-theme="dark"] .intro-text{letter-spacing:.03em;}
html[data-theme="dark"] .intro-text::before{content:"";position:absolute;inset:-14px -26px -18px -26px;border-radius:28px;background:linear-gradient(140deg,rgba(255,255,255,.08),rgba(255,255,255,.015) 55%,rgba(255,255,255,0) 85%);box-shadow:0 10px 38px -10px rgba(0,0,0,.85),0 4px 18px -6px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.06) inset;pointer-events:none;filter:blur(.3px)}
html[data-theme="dark"] .intro-text .word{background:none;padding:0 .22em .05em;border-radius:14px;position:relative;color:#ffffff;font-weight:800;text-shadow:0 1px 1px rgba(0,0,0,.55),0 2px 2px rgba(0,0,0,.55),0 3px 6px rgba(0,0,0,.65),0 8px 26px -6px rgba(0,0,0,.85);}
html[data-theme="dark"] .intro-text .word::before{content:"";position:absolute;inset:0;border-radius:14px;background:linear-gradient(185deg,rgba(255,255,255,.22),rgba(255,255,255,.04) 55%,rgba(0,0,0,.35) 100%);mix-blend-mode:overlay;opacity:.4;pointer-events:none}
html[data-theme="dark"] .intro-text .word.accent{color:#ffffff;background:none;-webkit-background-clip:unset;text-shadow:0 1px 1px rgba(0,0,0,.55),0 3px 8px rgba(0,0,0,.6),0 10px 26px -6px rgba(0,0,0,.8)}
html[data-theme="dark"] .intro-text .word.accent::before{background:linear-gradient(185deg,rgba(255,255,255,.35),rgba(255,255,255,.06) 55%,rgba(0,0,0,.45) 100%);opacity:.28}
/* Subtle hover (if user hovers) */
@media (hover:hover){html[data-theme="dark"] .intro-text .word:hover::before{opacity:.55}}
</style>
<script>
// Early theme application to avoid flash
(()=>{try{const pref=localStorage.getItem('themePref');if(pref&&pref!=='system'){document.documentElement.setAttribute('data-theme',pref);} }catch(e){}})();
</script>
<script type="application/ld+json">${jsonld}</script>
<script>
(async () => { // avatar favicon
  const user='thientrile';
  try {const r=await fetch('https://api.github.com/users/'+user,{headers:{'Accept':'application/vnd.github+json'}});if(r.ok){const j=await r.json();if(j.avatar_url){const l=document.getElementById('dynamic-favicon');if(l) l.href=j.avatar_url+'&s=64';const av=document.getElementById('profile-avatar');if(av) av.src=j.avatar_url+'&s=160';}}}catch(e){console.warn('avatar load fail',e)}
})();
</script>
</head><body>
<div class="intro-screen"><div class="intro-inner"><span class="intro-text"><span class="word">liguni</span> <span class="word accent">dev</span></span></div></div>
<nav class="top-tabs" id="top-tabs" aria-label="Sections Navigation">${topTabsHtml}</nav>
<div class="layout">
  <aside class="sidebar">
    ${sidebarHtml}
    <nav class="toc"><strong>Sections</strong>${tocHtml}</nav>
  </aside>
  <main class="main">${enhancedBody}</main>
</div>
<button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme">🖥️ Auto</button>
<!-- html2pdf removed (SRI mismatch issue) - loaded on demand in PDF handler -->
<script>
document.documentElement.classList.add('js');
document.body.classList.add('preload');
function __cvInit(){
  // Intro sequence: show layout quickly, finish intro after animation end
  setTimeout(()=>{document.body.classList.add('ready');},80);
  const introText=document.querySelector('.intro-text');
  if(introText){
    introText.addEventListener('animationend',()=>{
      document.body.classList.add('intro-done');
    });
    // Fallback in case animationend not fired
    setTimeout(()=>document.body.classList.add('intro-done'),1800);
  } else {
    document.body.classList.add('intro-done');
  }
  // Scroll reveal
  const els=[...document.querySelectorAll('[data-reveal]')];
  if('IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){
          const el=e.target;
          // stagger delay dựa trên order mod 8 để không quá dài
          const order=parseInt(el.getAttribute('data-reveal-order')||'0',10);
          const delay=Math.min(0.6,(order%8)*0.08);
          el.style.transitionDelay = String(delay) + 's';
          el.classList.add('reveal-in');
          io.unobserve(el);
        } })
    },{threshold:.08, rootMargin:'0px 0px -10% 0px'});
    els.forEach(el=>io.observe(el));
  } else {
    els.forEach(el=>el.classList.add('reveal-in'));
  }
  // Active tab highlight
  const tabLinks=[...document.querySelectorAll('.top-tabs a')];
  if('IntersectionObserver'in window && tabLinks.length){
    const heads=[...document.querySelectorAll('h2[id]')];
    const activeSet=new Set();
    const io2=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          const id=en.target.id;
          tabLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+id));
        }
      });
    },{rootMargin:'-40% 0px -50% 0px',threshold:[0,1]});
    heads.forEach(h=>io2.observe(h));
  }
  // Top tabs overflow detection + drag scroll
  const topTabs=document.getElementById('top-tabs');
  const tabsScroll = topTabs?.querySelector('.tabs-scroll');
  const menuBtn=document.getElementById('tabs-menu-btn');
  const menuPanel=document.getElementById('tabs-menu-panel');
  function checkOverflow(){
    if(!topTabs||!tabsScroll) return;
    const over = tabsScroll.scrollWidth > tabsScroll.clientWidth + 5;
    topTabs.classList.toggle('is-overflow', over);
    // If now not overflow and viewport >520px hide menu panel if open
    if(!over && window.innerWidth>520 && !window.matchMedia('(max-width:520px)').matches){
      if(menuPanel && !menuPanel.hasAttribute('hidden')){menuPanel.setAttribute('hidden',''); topTabs.classList.remove('menu-open'); menuBtn?.setAttribute('aria-expanded','false');}
    }
  }
  let dragStartX=0; let scrollStart=0; let dragging=false;
  if(tabsScroll){
    ['load','resize'].forEach(ev=>window.addEventListener(ev,checkOverflow));
    checkOverflow();
    tabsScroll.addEventListener('wheel',e=>{ if(e.deltaY && Math.abs(e.deltaY)>Math.abs(e.deltaX)){ tabsScroll.scrollLeft += e.deltaY; e.preventDefault(); } }, {passive:false});
    tabsScroll.addEventListener('pointerdown',e=>{dragging=true; dragStartX=e.clientX; scrollStart=tabsScroll.scrollLeft; tabsScroll.classList.add('dragging'); tabsScroll.setPointerCapture(e.pointerId);});
    tabsScroll.addEventListener('pointermove',e=>{ if(!dragging) return; const dx=e.clientX-dragStartX; tabsScroll.scrollLeft=scrollStart-dx; });
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>tabsScroll.addEventListener(ev,()=>{dragging=false; tabsScroll.classList.remove('dragging');}));
  }
  // Mobile menu: clone links into panel on demand
  function buildMenuLinks(){
    if(!menuPanel||!tabsScroll) return;
    if(menuPanel.dataset.built) return;
    menuPanel.innerHTML = tabsScroll.innerHTML; // simple clone
    menuPanel.dataset.built='1';
  }
  // Pre-build on load for mobile (so active highlight works immediately)
  if(window.matchMedia('(max-width:520px)').matches){ buildMenuLinks(); }
  menuBtn?.addEventListener('click',()=>{
    if(!menuPanel) return;
    buildMenuLinks();
    const open = !menuPanel.hasAttribute('hidden');
    if(open){
      menuPanel.setAttribute('hidden','');
      menuBtn.setAttribute('aria-expanded','false');
      topTabs.classList.remove('menu-open');
    } else {
      menuPanel.removeAttribute('hidden');
      menuBtn.setAttribute('aria-expanded','true');
      topTabs.classList.add('menu-open');
    }
  });
  // Close when clicking a link (and scroll to section)
  menuPanel?.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(a){
      menuPanel.setAttribute('hidden','');
      menuBtn?.setAttribute('aria-expanded','false');
      topTabs.classList.remove('menu-open');
    }
  });
  // Close on outside click
  document.addEventListener('click',e=>{
    if(!menuPanel || menuPanel.hasAttribute('hidden')) return;
    if(e.target.closest('#tabs-menu-btn')|| e.target.closest('#tabs-menu-panel')) return;
    menuPanel.setAttribute('hidden','');
    menuBtn?.setAttribute('aria-expanded','false');
    topTabs.classList.remove('menu-open');
  });
  // Tab click smooth (already CSS smooth); close intro quickly if clicking
  document.getElementById('top-tabs')?.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(a){document.body.classList.add('intro-done');}
  });
  // Theme toggle logic
  const btn=document.getElementById('theme-toggle');
  const updateBtn=(mode)=>{if(!btn) return;const icon= mode==='light'?'🌞':mode==='dark'?'🌙':'🖥️'; const label= mode==='light'?'Light':'Dark'; btn.textContent= mode==='system'? icon+' Auto': icon+' '+label;};
  const applyPref=(pref)=>{ if(pref==='system'){document.documentElement.removeAttribute('data-theme');} else {document.documentElement.setAttribute('data-theme',pref);} updateBtn(pref);};
  let current = (localStorage.getItem('themePref'))||'system';
  applyPref(current);
  btn?.addEventListener('click',()=>{current = current==='system'?'light': current==='light'?'dark':'system'; localStorage.setItem('themePref',current); applyPref(current);});
  // Listen to system changes if in system mode
  const mql=window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change',()=>{ if(current==='system'){applyPref('system');}});
  // PDF download (static file). Print removed.
  const pdfBtn=document.getElementById('cv-pdf-btn');
  pdfBtn?.addEventListener('click', ()=>{
    const file='cv/Le_Thien_Tri_CV.pdf';
    try {
      const a=document.createElement('a');
      a.href=file; a.download='Le_Thien_Tri_CV.pdf';
      document.body.appendChild(a); a.click(); a.remove();
    } catch(e){
      // fallback open
      window.open(file,'_blank');
    }
    // remove print button if still in DOM (legacy pages)
    const legacyPrint=document.getElementById('cv-print-btn');
    legacyPrint?.remove();
  });
  // Mark hero heading for export-hide (first h1 inside main content)
  const hero = document.querySelector('.main h1');
  if(hero) hero.classList.add('hero-export-hide');
  // Fallback re-bind after delay if initial binding failed for some reason
  // Minimal delegated fallback: ensure clicking the button still triggers if dynamically replaced
  document.addEventListener('click',(e)=>{
    if(e.target.closest('#cv-pdf-btn')){
      pdfBtn?.click();
    }
  },true);
}
if(document.readyState==='complete'){__cvInit();} else {window.addEventListener('load',__cvInit,{once:true});}
</script>
</body></html>`;
}

async function main() {
  const raw = await fs.readFile(README, "utf8");
  const md = stripSections(raw);

  // Extract sections for sidebar
  const aboutSec = extractSection(md, 'About Me') || '';
  const contactSec = extractSection(md, 'Contact') || '';

  // Basic name & tagline from heading
  const headingMatch = md.match(/# +.+?\n/);
  const nameLine = headingMatch ? headingMatch[0].replace(/^#+\s*/,'').trim() : 'Profile';
  const taglineMatch = md.match(/Fullstack Developer.*|Workflow Optimizer.*|Automation Enthusiast.*/);
  const tagline = taglineMatch ? taglineMatch[0] : 'Software Engineer';

  // Derive a clean display name: prefer bolded name inside heading, else strip decorations
  let displayName = 'Le Thien Tri';
  const boldName = nameLine.match(/\*\*(.+?)\*\*/);
  if (boldName) {
    displayName = boldName[1].replace(/<.*?>/g,'').trim();
  } else {
    // Remove greeting phrases, emoji, parentheses aliases
    const stripped = nameLine
      .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/gu,'')
      .replace(/hi[,!]?\s*i['’]m\s*/i,'')
      .replace(/\(.*?\).*/,'')
      .replace(/\*|`|_/g,'')
      .trim();
    if (stripped) displayName = stripped;
  }

  // Clean body (remove duplicated sections we surface in sidebar)
  let bodyMd = removeSection(removeSection(md,'About Me'),'Contact');

  const bodyHtmlRaw = marked.parse(bodyMd);
  let bodyHtml = injectHeadingIds(bodyHtmlRaw);
  bodyHtml = transformProjects(bodyHtml);
  bodyHtml = enhanceTimeline(bodyHtml);
  const tocHtml = buildTOC(bodyHtml);

  function extractListItems(sectionMd){
    return sectionMd.split(/\n/).filter(l=>/^- |• /.test(l.trim())).map(l=>l.replace(/^[-•]\s*/,''));
  }
  const aboutList = extractListItems(aboutSec).slice(0,8);
  const contactList = extractListItems(contactSec);

  const contactHtml = contactList.map(line => {
    const m = line.match(/\[(.+?)\]\((.+?)\)/);
    if (m) return `<a href="${m[2]}" target="_blank" rel="noopener">${m[1]}</a>`;
    return `<span>${line}</span>`;
  }).join('');

  const sidebarHtml = `
    <img id="profile-avatar" alt="avatar" width="120" height="120" style="border-radius:50%;display:block;margin:0 auto 12px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,.15)"/>
    <h1>${displayName}</h1>
    <div class="tagline">${tagline}</div>
    <div class="about">${aboutList.map(x=>`<div class='badge'>${x.replace(/<.*?>/g,'')}</div>`).join('')}</div>
    <hr style="margin:16px 0;border:none;border-top:1px solid #d0d7de;"/>
    <div class="contact">${contactHtml}</div>
  `;

  const jsonld = buildJSONLD({ name: displayName, tagline });
  const meta = { title: displayName + ' | CV Profile', desc: tagline.replace(/"/g,'') };
  const finalHtml = htmlShell({ bodyHtml, sidebarHtml, tocHtml, jsonld, meta });
  await fs.writeFile(OUT, finalHtml, 'utf8');
  console.log(`✔ Built CV style ${OUT} from ${README}`);
}
main().catch(e => { console.error(e); process.exit(1); });
