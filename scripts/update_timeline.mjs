// scripts/update_timeline.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile";

/** SOURCES (bật/tắt) **/
const USE_JSON   = (process.env.TIMELINE_USE_JSON   ?? "true")  === "true";
const USE_CASES  = (process.env.TIMELINE_USE_CASES  ?? "true")  === "true";
// Bật repos mặc định để luôn hiển thị hoạt động Git
const USE_REPOS  = (process.env.TIMELINE_USE_REPOS  ?? "true") === "true";

// Chiến lược gộp: prefer-json | first | all
const DEDUPE_STRATEGY = process.env.TIMELINE_DEDUPE || "prefer-json";
// Hiển thị nhãn nguồn (JSON / Case / Git)
const SHOW_SOURCE_LABELS = (process.env.TIMELINE_SOURCE_LABELS || "false") === "true";

/** REPO OPTIONS **/
const MODE  = process.env.TIMELINE_MODE   || "pushed";   // created | pushed | release
const LIMIT = Number(process.env.TIMELINE_LIMIT || 10);
const EXCLUDE = (process.env.TIMELINE_EXCLUDE || "").split(",").map(s => s.trim()).filter(Boolean);

const repoRoot   = process.cwd();
const readmePath = path.join(repoRoot, "README.md");
const dataPath   = path.join(repoRoot, "data", "timeline.json");
const casesDir   = path.join(repoRoot, "case-studies");

const START = "<!--TIMELINE:START-->";
const END   = "<!--TIMELINE:END-->";

function regexBetween(a, b) {
  return new RegExp(`${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`);
}
const toTs = (iso) => new Date((iso || "1970-01-01") + (iso?.includes("T") ? "" : "T00:00:00Z")).getTime();
const fmt  = (iso) => (iso || "").slice(0, 10);
const yyyy = (iso) => (iso || "").slice(0, 4);

async function loadJson() {
  if (!USE_JSON) return [];
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const todayIso = new Date().toISOString().slice(0,10);
    return arr.map(e => {
      // Support year range entries: { year: "2024 – Now", title: ... }
      if (e.year && !e.date) {
        const yrStr = String(e.year).trim();
        const parts = yrStr.split(/[-–—]/).map(s => s.trim());
        let startYear = parts[0];
        let endYear = parts[1] || parts[0];
        const nowYear = new Date().getFullYear().toString();
        const isOngoing = /now/i.test(endYear);
        if (isOngoing) endYear = nowYear;
        // Use end year for chronological placement
        const syntheticDate = `${endYear}-12-31`;
        return {
          source: "json",
          ...e,
          date: syntheticDate,
          _yearRange: yrStr,
          ongoing: isOngoing
        };
      }
      return { source: "json", ...e };
    });
  } catch { return []; }
}

function parseDateFromName(name) {
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
async function loadCases() {
  if (!USE_CASES) return [];
  try { await fs.stat(casesDir); } catch { return []; }
  const files = (await fs.readdir(casesDir)).filter(f => f.endsWith(".md"));
  const items = [];
  for (const file of files) {
    const date = parseDateFromName(file);
    const content = await fs.readFile(path.join(casesDir, file), "utf8");
    const titleLine = content.split("\n").find(l => l.trim().startsWith("#"));
    const title = (titleLine || file).replace(/^#\s*/, "").trim();
    items.push({
      source: "cases",
      date: date ?? "1970-01-01",
      title,
      details: "Case study",
      link: `./case-studies/${encodeURIComponent(file)}`,
      icon: "📄"
    });
  }
  return items;
}

async function gh(pathname, token) {
  const url = `https://api.github.com${pathname}`;
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "readme-timeline"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
async function fetchRepos(username, token) {
  const repos = await gh(`/users/${username}/repos?per_page=100`, token);
  return repos.filter(r => !r.fork && !EXCLUDE.includes(r.name));
}
async function latestReleaseDate(owner, repo, token) {
  try {
    const rel = await gh(`/repos/${owner}/${repo}/releases/latest`, token);
    return rel.published_at || rel.created_at || null;
  } catch { return null; }
}
async function loadRepos() {
  if (!USE_REPOS) return [];
  const token = process.env.GITHUB_TOKEN;
  const repos = await fetchRepos(USERNAME, token);
  const events = await Promise.all(repos.map(async (r) => {
    let date = r.pushed_at;
    if (MODE === "created") date = r.created_at;
    if (MODE === "release") date = (await latestReleaseDate(USERNAME, r.name, token)) || r.pushed_at;
    return {
      source: "repos",
      date,
      title: r.name,
      details: (r.description || "Repository") + (r.language ? ` • ${r.language}` : "") + (r.stargazers_count ? ` ⭐ ${r.stargazers_count}` : ""),
      link: r.html_url,
      icon: "📦"
    };
  }));
  return events
    .filter(e => e.date)
    .sort((a, b) => toTs(b.date) - toTs(a.date))
    .slice(0, LIMIT);
}

function mergeAndDedupe(jsonItems, caseItems, repoItems) {
  if (DEDUPE_STRATEGY === 'all') {
    return [...jsonItems, ...caseItems, ...repoItems];
  }
  const byKey = new Map();
  const ordered = [...jsonItems, ...caseItems, ...repoItems]; // JSON trước nếu prefer-json
  for (const item of ordered) {
    const key = `${item.date}::${item.title}`.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, item);
    } else if (DEDUPE_STRATEGY === 'prefer-json' && item.source === 'json') {
      byKey.set(key, item); // JSON ghi đè
    }
    // nếu strategy = first thì bỏ qua ghi đè
  }
  return [...byKey.values()];
}

function groupRender(items) {
  if (!items.length) return "- (No timeline items yet)";
  // pin items giữ nguyên năm nhưng ưu tiên đầu danh sách năm
  items.sort((a, b) => {
    const d = toTs(b.date) - toTs(a.date);
    if (d !== 0) return d;
    // nếu cùng ngày, JSON trước
    if (a.source !== b.source) return a.source === "json" ? -1 : 1;
    return 0;
  });
  const byYear = new Map();
  for (const e of items) {
    const y = yyyy(e.date) || "Unknown";
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(e);
  }
  const years = [...byYear.entries()].sort((a,b) => Number(b[0]) - Number(a[0]));
  const out = [];
  for (const [year, arr] of years) {
    // pin lên đầu năm
    const pins = arr.filter(i => i.pin);
    const rest = arr.filter(i => !i.pin);
    const ordered = [...pins, ...rest];
    out.push(`### ${year}`);
    for (const e of ordered) {
      const icon = e.icon || (e.source === "repos" ? "📦" : e.source === "cases" ? "📄" : "🧩");
  const title = e.link ? `[${e.title}](${e.link})` : e.title;
  const dateDisplay = e._yearRange ? e._yearRange : fmt(e.date);
  const sourceLabel = SHOW_SOURCE_LABELS ? ` _( ${e.source} )_` : "";
  out.push(`- ${icon} **${dateDisplay}** — ${title}${e.details ? ` — _${e.details}_` : ""}${sourceLabel}`);
    }
    out.push("");
  }
  return out.join("\n").trim();
}

async function main() {
  const [jsonItems, caseItems, repoItems] = await Promise.all([
    loadJson(),
    loadCases(),
    loadRepos()
  ]);
  const merged = mergeAndDedupe(jsonItems, caseItems, repoItems);
  const body = groupRender(merged);
  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes(START) || !readme.includes(END)) {
    throw new Error("Markers not found in README.md for TIMELINE");
  }
  const block = `${START}\n${body}\n${END}`;
  const updated = readme.replace(regexBetween(START, END), block);
  if (updated !== readme) {
    await fs.writeFile(readmePath, updated, "utf8");
    console.log(`Timeline updated: json=${jsonItems.length}, cases=${caseItems.length}, repos=${repoItems.length}`);
  } else {
    console.log("No changes for Timeline ✋");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
