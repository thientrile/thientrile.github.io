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
    const name=nameMatch?nameMatch[1]:project.replace(/<.*?>/g,'');
    const linkMatch=project.match(/href="(.*?)"/);
    const href=linkMatch?linkMatch[1]:'';
    const cleanDesc=desc.replace(/<.*?>/g,'');
    const langIcon = iconUrl(tech?.split(/[,/]|\s+/)[0]);
    const iconTag = langIcon ? `<img class=\"project-icon\" src=\"${langIcon}\" alt=\"${tech}\" loading=\"lazy\" width=\"20\" height=\"20\"/>` : '';
    return `<div class="project-card" data-reveal data-reveal-type="fade-up">`+
      `<h3 class="project-title">${iconTag}<a href="${href}" target="_blank" rel="noopener">${name}</a></h3>`+
      `<div class="project-meta">${tech?`<span class="pill pill-lang">${tech}</span>`:''}${stars?`<span class="pill pill-star">★ ${stars}</span>`:''}${updated?`<span class="pill pill-date">${updated}</span>`:''}</div>`+
      (cleanDesc?`<p class="project-desc">${cleanDesc}</p>`:'')+
    `</div>`;
  }).join('');
  // Don't nest markers inside existing marker block; keep only outer markers
  const grid=`<div class="projects-grid">${cards}</div>`;
  const newBlock=block.replace(tableHtml, grid);
  return html.slice(0,s)+newBlock+html.slice(e+endMarker.length);
}

function htmlShell({ bodyHtml, sidebarHtml, tocHtml, jsonld, meta }) {
  // Inject data-reveal attributes for simple reveal targets
  let enhancedBody = bodyHtml
    // only add if not already containing data-reveal
    .replace(/<h2(?![^>]*data-reveal)/g,'<h2 data-reveal')
    .replace(/<h3(?![^>]*data-reveal)/g,'<h3 data-reveal')
    .replace(/<p(?![^>]*data-reveal)>/g,'<p data-reveal>')
    .replace(/<li(?![^>]*data-reveal)>/g,'<li data-reveal>');
  // Gán kiểu animation luân phiên & order cho stagger
  const types = ['fade-up','fade-left','fade-right','scale','rise'];
  let revealIndex = -1;
  enhancedBody = enhancedBody.replace(/data-reveal(?!-type)/g, () => {
    revealIndex++;
    const t = types[revealIndex % types.length];
    return `data-reveal data-reveal-type="${t}" data-reveal-order="${revealIndex}"`;
  });
  // Chuẩn bị top tab nav từ tocHtml
  const topTabsHtml = tocHtml
    .replace('<ul>','')
    .replace('</ul>','')
    .replace(/<li>/g,'')
    .replace(/<\/li>/g,'');
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
.intro-screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--app-bg);color:#fff;z-index:1000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
.intro-screen:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 35% 35%,rgba(37,99,235,.22),rgba(30,64,175,.08),transparent 70%);mix-blend-mode:overlay;pointer-events:none}
.intro-inner{text-align:center}
/* New intro animation: text grows from small to large then fades */
.intro-text{font-size:clamp(2.4rem,6vw,5rem);font-weight:700;letter-spacing:.04em;display:inline-block;position:relative;animation:popGrow 1.55s var(--ease) forwards}
.intro-text .word{display:inline-block}
.intro-text .accent{background:linear-gradient(90deg,var(--accent),#60a5fa);-webkit-background-clip:text;color:transparent}
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
.sidebar h1{margin-top:0;font-size:1.5rem}
.tagline{font-size:.9rem;opacity:.8;margin-top:-6px;margin-bottom:12px}
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
.top-tabs{position:sticky;top:0;z-index:500;backdrop-filter:saturate(180%) blur(14px);background:rgba(255,255,255,.78);border-bottom:1px solid rgba(0,0,0,.06);padding:6px 12px;display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;justify-content:center;min-height:var(--tabs-h)}
.top-tabs::-webkit-scrollbar{display:none}
@media (prefers-color-scheme: dark){.top-tabs{background:rgba(13,17,23,.78);border-bottom:1px solid rgba(255,255,255,.08)}}
.top-tabs a{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:8px 12px;border-radius:22px;position:relative;display:inline-flex;align-items:center;line-height:1;color:#334155;background:rgba(0,0,0,.04);text-decoration:none;flex:0 0 auto;transition:background .35s var(--ease),color .35s var(--ease)}
@media (prefers-color-scheme: dark){.top-tabs a{color:#cbd5e1;background:rgba(255,255,255,.06)}}
.top-tabs a:hover{background:var(--accent);color:var(--accent-fg)}
.top-tabs a.active{background:linear-gradient(90deg,var(--accent),#4f8ef7);color:var(--accent-fg);box-shadow:0 0 0 1px rgba(255,255,255,.4) inset}
.top-tabs-fade{pointer-events:none;position:absolute;top:0;bottom:0;width:48px}
.top-tabs-fade.left{left:0;background:linear-gradient(90deg,var(--app-bg),rgba(255,255,255,0))}
@media (prefers-color-scheme: dark){.top-tabs-fade.left{background:linear-gradient(90deg,rgba(13,17,23,1),rgba(13,17,23,0))}}
.top-tabs-fade.right{right:0;background:linear-gradient(270deg,var(--app-bg),rgba(255,255,255,0))}
@media (prefers-color-scheme: dark){.top-tabs-fade.right{background:linear-gradient(270deg,rgba(13,17,23,1),rgba(13,17,23,0))}}
@media print{body{background:#fff}.sidebar,nav.toc{position:static;box-shadow:none}.panel{box-shadow:none;border:1px solid #ddd;page-break-inside:avoid}a{text-decoration:none} .layout{display:block;max-width:1000px} }
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
.project-desc{margin:0;font-size:.8rem;line-height:1.3;opacity:.85}
@media print{.projects-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.project-card{box-shadow:none;border:1px solid #ccc}}
</style>
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
<script>
document.documentElement.classList.add('js');
document.body.classList.add('preload');
window.addEventListener('load',()=>{
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
  // Tab click smooth (already CSS smooth); close intro quickly if clicking
  document.getElementById('top-tabs')?.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(a){document.body.classList.add('intro-done');}
  });
});
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

  // Clean body (remove duplicated sections we surface in sidebar)
  let bodyMd = removeSection(removeSection(md,'About Me'),'Contact');

  const bodyHtmlRaw = marked.parse(bodyMd);
  let bodyHtml = injectHeadingIds(bodyHtmlRaw);
  bodyHtml = transformProjects(bodyHtml);
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
    <h1>${nameLine}</h1>
    <div class="tagline">${tagline}</div>
    <div class="about">${aboutList.map(x=>`<div class='badge'>${x.replace(/<.*?>/g,'')}</div>`).join('')}</div>
    <hr style="margin:16px 0;border:none;border-top:1px solid #d0d7de;"/>
    <div class="contact">${contactHtml}</div>
  `;

  const jsonld = buildJSONLD({ name: nameLine, tagline });
  const meta = { title: 'Le Thien Tri | CV Profile', desc: tagline.replace(/"/g,'') };
  const finalHtml = htmlShell({ bodyHtml, sidebarHtml, tocHtml, jsonld, meta });
  await fs.writeFile(OUT, finalHtml, 'utf8');
  console.log(`✔ Built CV style ${OUT} from ${README}`);
}
main().catch(e => { console.error(e); process.exit(1); });
