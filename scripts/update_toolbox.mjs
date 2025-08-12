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

// Map ngôn ngữ -> devicon path basename
const ICON_MAP = {
  'JavaScript':'javascript/javascript-original',
  'TypeScript':'typescript/typescript-original',
  'Go':'go/go-original',
  'HTML':'html5/html5-original',
  'CSS':'css3/css3-original',
  'Vue':'vuejs/vuejs-original',
  'Vue.js':'vuejs/vuejs-original',
  'React':'react/react-original',
  'Python':'python/python-original',
  'Java':'java/java-original',
  'C#':'csharp/csharp-original',
  'PHP':'php/php-original',
  'Ruby':'ruby/ruby-original',
  'Rust':'rust/rust-plain',
  'Dockerfile':'docker/docker-original',
  'Docker':'docker/docker-original',
  'Shell':'bash/bash-original',
  'PowerShell':'powershell/powershell-original',
  'Kotlin':'kotlin/kotlin-original',
  'Swift':'swift/swift-original',
  'C++':'cplusplus/cplusplus-original',
  'C':'c/c-original',
  'Scala':'scala/scala-original',
  'Perl':'perl/perl-original',
  'Haskell':'haskell/haskell-original',
  'Elixir':'elixir/elixir-original',
  'MongoDB':'mongodb/mongodb-original',
  'Redis':'redis/redis-original',
  'PostgreSQL':'postgresql/postgresql-original',
  'MySQL':'mysql/mysql-original',
  'SQLite':'sqlite/sqlite-original',
  'Nginx':'nginx/nginx-original',
  'AWS':'amazonwebservices/amazonwebservices-original-wordmark'
};

// Whitelist + order ưu tiên (có thể chỉnh cho profile này)
const ORDER = [
  'JavaScript','TypeScript','React','Node.js','Go','MongoDB','Redis','Docker','Nginx','AWS'
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
  // Lọc theo ORDER + bổ sung những cái khác sau
  const ordered = [
    ...ORDER.filter(o => present.includes(o)),
    ...present.filter(p => !ORDER.includes(p))
  ];
  const uniq = ordered.filter((v,i,a)=>a.indexOf(v)===i);
  const tags = [];
  for (const name of uniq){
    const key = name.replace(/\.js$/,'');
    let iconPath = ICON_MAP[key] || ICON_MAP[name] || null;
    // Heuristic cho Node.js
    if (name === 'Node.js') iconPath = 'nodejs/nodejs-original';
    if (!iconPath) continue;
    tags.push(`<img height="28" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${iconPath}.svg" alt="${name}" title="${name}" />`);
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
