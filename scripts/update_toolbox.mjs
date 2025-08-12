// scripts/update_toolbox.mjs
import fs from 'fs/promises';
import path from 'path';

/**
 * Tự động cập nhật khối TECH TOOLBOX dựa trên ngôn ngữ / tech xuất hiện trong public repositories.
 * - Dùng GitHub API liệt kê repos → thống kê language chính.
 * - Map language -> icon devicon.
 * - Giữ whitelist để kiểm soát thứ tự hiển thị.
 */

const USERNAME = process.env.GH_USERNAME || 'thientrile';
const TOKEN = process.env.GITHUB_TOKEN;
const README = path.join(process.cwd(), 'README.md');

const START = '<!--TECH_TOOLBOX:START-->';
const END   = '<!--TECH_TOOLBOX:END-->';

function regexBetween(a,b){
  return new RegExp(`${a.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}`);
}

async function gh(pathname){
  const url = `https://api.github.com${pathname}`;
  const headers = { 'Accept':'application/vnd.github+json','User-Agent':'toolbox-updater'};
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const r = await fetch(url,{headers});
  if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// SOURCE ICONS
// Cho phép chọn nguồn icon qua ENV: TECH_ICON_SOURCE = "npm" | "gh"
// gh  -> GitHub repo (cũ): https://cdn.jsdelivr.net/gh/devicons/devicon/icons/{slug}/{variant}.svg
// npm -> NPM package:     https://cdn.jsdelivr.net/npm/devicon@latest/icons/{slug}/{variant}.svg
const ICON_SOURCE = (process.env.TECH_ICON_SOURCE || 'npm').toLowerCase();

// Map ngôn ngữ/tech -> slug (không chứa phần đuôi variant)
const ICON_MAP = {
  'JavaScript':'javascript',
  'TypeScript':'typescript',
  'Go':'go',
  'HTML':'html5',
  'CSS':'css3',
  'Vue':'vuejs',
  'Vue.js':'vuejs',
  'React':'react',
  'Python':'python',
  'Java':'java',
  'C#':'csharp',
  'PHP':'php',
  'Ruby':'ruby',
  'Rust':'rust',
  'Dockerfile':'docker',
  'Docker':'docker',
  'Shell':'bash',
  'PowerShell':'powershell',
  'Kotlin':'kotlin',
  'Swift':'swift',
  'C++':'cplusplus',
  'C':'c',
  'Scala':'scala',
  'Perl':'perl',
  'Haskell':'haskell',
  'Elixir':'elixir',
  'MongoDB':'mongodb',
  'Redis':'redis',
  'PostgreSQL':'postgresql',
  'MySQL':'mysql',
  'SQLite':'sqlite',
  'Nginx':'nginx',
  'AWS':'amazonwebservices',
  'Cloudinary':'cloudinary'
};

const NOT_IN_DEVICON = new Set(['cloudinary']);
function buildIconUrl(slug) {
  const variant = slug === 'amazonwebservices' ? 'amazonwebservices-original-wordmark'
    : slug === 'rust' ? 'rust-plain'
    : `${slug}-original`;
  if (slug === 'cloudinary') {
    // dùng simpleicons cho Cloudinary vì devicon chưa có
    return 'https://cdn.simpleicons.org/cloudinary/3693F3';
  }
  if (ICON_SOURCE === 'gh') {
    return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${variant}.svg`;
  }
  // npm (package tên devicon, không phải devicons)
  return `https://cdn.jsdelivr.net/npm/devicon@latest/icons/${slug}/${variant}.svg`;
}

// Whitelist + order ưu tiên (có thể chỉnh cho profile này)
const ORDER = [
  'JavaScript','TypeScript','React','Node.js','Go','MongoDB','Redis','Docker','Nginx','AWS'
];

// Luôn hiển thị ngay cả khi không có repo nào detect ra
const MANDATORY = [
  'Docker','Redis','MongoDB','MySQL','Nginx','AWS','Cloudinary'
];

function normalizeName(lang){
  if (lang === 'Jupyter Notebook') return 'Python';
  if (lang === 'SCSS' || lang === 'Less') return 'CSS';
  if (lang === 'Shell') return 'Shell';
  return lang;
}

async function fetchLanguages(){
  const repos = await gh(`/users/${USERNAME}/repos?per_page=100`);
  const counts = new Map();
  for (const r of repos){
    if (r.fork) continue;
    if (!r.language) continue;
    const name = normalizeName(r.language);
    counts.set(name, (counts.get(name)||0)+1);
  }
  return counts;
}

function buildIcons(counts){
  const present = [...counts.keys()];
  // Node.js không phải language primary trên GitHub (hiển thị JavaScript). Nếu dùng JS và có backend -> ép thêm Node.js
  if (present.includes('JavaScript') && !present.includes('Node.js')) present.splice(present.indexOf('JavaScript')+1,0,'Node.js');
  // Bắt đầu với mandatory (giữ thứ tự), sau đó ORDER, sau đó phần còn lại
  const ordered = [
    ...MANDATORY,
    ...ORDER.filter(o => present.includes(o)),
    ...present.filter(p => !ORDER.includes(p))
  ];
  const uniq = ordered.filter((v,i,a)=>a.indexOf(v)===i);
  const tags = [];
  for (const name of uniq){
    const key = name.replace(/\.js$/,'');
  let slug = ICON_MAP[key] || ICON_MAP[name] || null;
  if (name === 'Node.js') slug = 'nodejs';
  if (!slug) continue;
  const url = buildIconUrl(slug);
  tags.push(`<img height="28" src="${url}" alt="${name}" title="${name}" />`);
  }
  return `<p>\n  ${tags.join('\n  ')}\n</p>`;
}

async function main(){
  const counts = await fetchLanguages();
  const block = buildIcons(counts);
  let readme = await fs.readFile(README,'utf8');
  if(!readme.includes(START) || !readme.includes(END)){
    console.error('TECH_TOOLBOX markers not found');
    process.exit(1);
  }
  const newSection = `${START}\n${block}\n${END}`;
  const updated = readme.replace(regexBetween(START, END), newSection);
  if (updated !== readme){
    await fs.writeFile(README, updated, 'utf8');
    console.log('Tech Toolbox updated ✅');
  } else {
    console.log('No changes for Tech Toolbox ✋');
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
