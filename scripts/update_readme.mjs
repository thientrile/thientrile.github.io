// scripts/update_readme.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile";
const MODE = process.env.FEATURED_MODE || "updated"; // "updated" | "stars"
const COUNT = Number(process.env.FEATURED_COUNT || 5);
const EXCLUDE = (process.env.FEATURED_EXCLUDE || "") // ví dụ: "soft-ui-dashboard,old-repo"
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");

// Markers
const RECENT_START = "<!--RECENT_ACTIVITY:START-->";
const RECENT_END   = "<!--RECENT_ACTIVITY:END-->";
const FEAT_START   = "<!--FEATURED_PROJECTS:START-->";
const FEAT_END     = "<!--FEATURED_PROJECTS:END-->";

function regexBetween(a, b) {
  return new RegExp(
    `${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
  );
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function renderEvent(ev) {
  const type = ev.type;
  const repo = ev.repo?.name ?? "(unknown)";
  const url = `https://github.com/${repo}`;
  if (type === "PushEvent") {
    const commits = ev.payload?.commits?.length ?? 1;
    return `- 🔼 Pushed **${commits}** commit(s) to [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  if (type === "PullRequestEvent") {
    const action = ev.payload?.action ?? "updated";
    const pr = ev.payload?.pull_request?.number;
    return `- 🔀 ${action} PR [#${pr}](${ev.payload?.pull_request?.html_url}) in [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  if (type === "IssuesEvent") {
    const action = ev.payload?.action ?? "updated";
    const issue = ev.payload?.issue?.number;
    return `- ❗ ${action} Issue [#${issue}](${ev.payload?.issue?.html_url}) in [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  if (type === "CreateEvent") {
    const refType = ev.payload?.ref_type ?? "ref";
    const ref = ev.payload?.ref ? ` \`${ev.payload.ref}\`` : "";
    return `- 🆕 Created ${refType}${ref} in [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  if (type === "ForkEvent")  return `- 🍴 Forked [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  if (type === "WatchEvent") return `- ⭐ Starred [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  return `- 📌 ${type} at [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
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

async function getRecent(username, token) {
  const events = await gh(`/users/${username}/events/public`, token);
  const lines = events.slice(0, 10).map(renderEvent);
  return lines.join("\n") || "- (chưa có hoạt động gần đây)";
}

async function getFeatured(username, token) {
  // Lấy tối đa 100 repo public rồi lọc/sort theo MODE
  const repos = await gh(`/users/${username}/repos?per_page=100`, token);

  const filtered = repos
    .filter(r => !r.fork) // bỏ fork
    .filter(r => !EXCLUDE.includes(r.name));

  const sorted =
    MODE === "stars"
      ? filtered.sort((a, b) => b.stargazers_count - a.stargazers_count)
      : filtered.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

  const top = sorted.slice(0, COUNT);

  if (!top.length) return "- (chưa có repository phù hợp)";

  const mapLang = (r) => (r.language ? ` • ${r.language}` : "");
  const mapStar = (r) => (r.stargazers_count ? ` ⭐ ${r.stargazers_count}` : "");
  const mapDesc = (r) => (r.description ? ` — ${r.description}` : "");

  return top
    .map(
      (r) =>
        `- **[${r.name}](${r.html_url})**${mapLang(r)}${mapStar(r)}${mapDesc(r)}`
    )
    .join("\n");
}

async function main() {
  const token = process.env.GITHUB_TOKEN; // có cũng tốt, không có vẫn chạy anonymous (giới hạn rate)

  // Build 2 phần nội dung
  const [recent, featured] = await Promise.all([
    getRecent(USERNAME, token),
    getFeatured(USERNAME, token),
  ]);

  let readme = await fs.readFile(readmePath, "utf8");

  // Replace Recent Activity
  const recentBlock = `${RECENT_START}\n${recent}\n${RECENT_END}`;
  readme = readme.replace(regexBetween(RECENT_START, RECENT_END), recentBlock);

  // Replace Featured Projects
  const featBlock = `${FEAT_START}\n${featured}\n${FEAT_END}`;
  readme = readme.replace(regexBetween(FEAT_START, FEAT_END), featBlock);

  await fs.writeFile(readmePath, readme, "utf8");
  console.log("README.md updated ✅");
}

main().catch((e) => {
  console.error("Updater failed:", e);
  process.exit(1);
});
