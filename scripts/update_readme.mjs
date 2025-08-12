// scripts/update_readme.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile";
const MODE = process.env.FEATURED_MODE || "updated"; // "updated" | "stars"
const COUNT = Number(process.env.FEATURED_COUNT || 5);
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
  const token = process.env.GITHUB_TOKEN;
  const featured = await getFeatured(USERNAME, token);

  let readme = await fs.readFile(readmePath, "utf8");

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
