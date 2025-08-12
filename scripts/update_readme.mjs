// scripts/update_readme.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile";
// Sorting mode (updated | stars)
const MODE = process.env.PROJECTS_MODE || process.env.FEATURED_MODE || "updated";
// How many projects to list (default 20)
const LIMIT = Number(process.env.PROJECTS_LIMIT || process.env.FEATURED_COUNT || 20);
const EXCLUDE = (process.env.FEATURED_EXCLUDE || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");

// Markers
const FEAT_START   = "<!--FEATURED_PROJECTS:START-->";
const FEAT_END     = "<!--FEATURED_PROJECTS:END-->";

function regexBetween(a, b) {
  return new RegExp(
    `${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
  );
}

async function gh(pathname, token) {
  const url = `https://api.github.com${pathname}`;
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "readme-updater",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function getProjects(username, token) {
  const repos = await gh(`/users/${username}/repos?per_page=100`, token);
  const filtered = repos
    .filter(r => !r.fork)
    .filter(r => !EXCLUDE.includes(r.name));

  const sorted = MODE === 'stars'
    ? filtered.sort((a,b)=> b.stargazers_count - a.stargazers_count || new Date(b.pushed_at)-new Date(a.pushed_at))
    : filtered.sort((a,b)=> new Date(b.pushed_at)-new Date(a.pushed_at));

  const list = sorted.slice(0, LIMIT);
  if (!list.length) return "- (chưa có repository phù hợp)";

  const header = `| Project | Tech | ⭐ | Updated | Description |\n|---------|------|----|---------|-------------|`;
  const rows = list.map(r => {
    const name = `**[${r.name}](${r.html_url})**`;
    const lang = r.language || '';
    const stars = r.stargazers_count ? String(r.stargazers_count) : '';
    const updated = r.pushed_at ? r.pushed_at.substring(0,10) : '';
    let desc = r.description || '';
    if (desc.length > 90) desc = desc.slice(0,87)+'…';
    desc = desc.replace(/\|/g,'∣');
    return `| ${name} | ${lang} | ${stars} | ${updated} | ${desc} |`;
  });
  return [header, ...rows].join('\n');
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const projects = await getProjects(USERNAME, token);

  let readme = await fs.readFile(readmePath, "utf8");

  // Replace Featured Projects
  const featBlock = `${FEAT_START}\n${projects}\n${FEAT_END}`;
  readme = readme.replace(regexBetween(FEAT_START, FEAT_END), featBlock);

  const original = await fs.readFile(readmePath, "utf8");
  if (original !== readme) {
    await fs.writeFile(readmePath, readme, "utf8");
    console.log("README.md updated ✅");
  } else {
  console.log("No changes for Projects ✋");
  }
}

main().catch((e) => {
  console.error("Updater failed:", e);
  process.exit(1);
});
