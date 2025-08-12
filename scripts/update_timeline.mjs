// scripts/update_timeline.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile";
const LIMIT = Number(process.env.TIMELINE_LIMIT || 10);
const MODE = process.env.TIMELINE_MODE || "pushed"; // "created" | "pushed" | "release"
const EXCLUDE = (process.env.TIMELINE_EXCLUDE || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");

const START = "<!--TIMELINE:START-->";
const END   = "<!--TIMELINE:END-->";

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
    "User-Agent": "readme-timeline",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchRepos(username, token) {
  // sort client-side để linh hoạt theo MODE
  const repos = await gh(`/users/${username}/repos?per_page=100`, token);
  return repos
    .filter(r => !r.fork)
    .filter(r => !EXCLUDE.includes(r.name));
}

async function fetchLatestRelease(owner, repo, token) {
  try {
    const rel = await gh(`/repos/${owner}/${repo}/releases/latest`, token);
    // nếu repo không có release, API sẽ trả 404 → rơi vào catch
    return rel.published_at || rel.created_at;
  } catch {
    return null;
  }
}

function yyyy(dateIso) { return dateIso?.slice(0, 4); }
function fmt(dateIso)  { return dateIso?.slice(0, 10); }
function toTs(dateIso) { return new Date(dateIso || "1970-01-01").getTime(); }

async function buildEventsFromRepos(username, token) {
  const repos = await fetchRepos(username, token);

  // map repo → event (date tùy theo MODE)
  const events = await Promise.all(repos.map(async (r) => {
    let dateForSort;
    if (MODE === "created") dateForSort = r.created_at;
    else if (MODE === "pushed") dateForSort = r.pushed_at;
    else if (MODE === "release") {
      dateForSort = await fetchLatestRelease(username, r.name, token);
      // fallback về pushed nếu không có release
      if (!dateForSort) dateForSort = r.pushed_at;
    }

    const lang = r.language ? ` • ${r.language}` : "";
    const stars = r.stargazers_count ? ` ⭐ ${r.stargazers_count}` : "";
    return {
      date: dateForSort,
      title: r.name,
      url: r.html_url,
      details: (r.description || "Repository") + lang + stars
    };
  }));

  // sort desc theo date & cắt LIMIT
  return events
    .filter(e => e.date)
    .sort((a, b) => toTs(b.date) - toTs(a.date))
    .slice(0, LIMIT);
}

function groupByYear(events) {
  const map = new Map();
  for (const e of events) {
    const y = yyyy(e.date) || "Unknown";
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(e);
  }
  return [...map.entries()]
    .sort((a,b) => Number(b[0]) - Number(a[0]))
    .map(([year, items]) => ({ year, items }));
}

function render(events) {
  if (!events.length) return "- (No repo events yet)";
  const groups = groupByYear(events);
  const out = [];
  for (const g of groups) {
    out.push(`### ${g.year}`);
    for (const e of g.items) {
      out.push(`- 📦 **${fmt(e.date)}** — [${e.title}](${e.url}) — _${e.details}_`);
    }
    out.push("");
  }
  return out.join("\n").trim();
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const events = await buildEventsFromRepos(USERNAME, token);
  const body = render(events);

  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes(START) || !readme.includes(END)) {
    throw new Error("Markers not found in README.md for TIMELINE");
  }
  const block = `${START}\n${body}\n${END}`;
  readme = readme.replace(regexBetween(START, END), block);
  await fs.writeFile(readmePath, readme, "utf8");
  console.log(`Timeline (from repos) updated: ${events.length} item(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
