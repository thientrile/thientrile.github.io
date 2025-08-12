// scripts/update_readme.mjs
import fs from "fs/promises";
import path from "path";

const USERNAME = process.env.GH_USERNAME || "thientrile"; // đã set sẵn
const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");

const START = "<!--RECENT_ACTIVITY:START-->";
const END = "<!--RECENT_ACTIVITY:END-->";

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function renderItem(ev) {
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
  if (type === "ForkEvent") {
    return `- 🍴 Forked [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  if (type === "WatchEvent") {
    return `- ⭐ Starred [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
  }
  return `- 📌 ${type} at [${repo}](${url}) — _${fmtDate(ev.created_at)}_`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is missing (provided automatically by GitHub Actions).");
  }

  const res = await fetch(`https://api.github.com/users/${USERNAME}/events/public`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const events = await res.json();
  const top = events.slice(0, 10).map(renderItem).join("\n");

  let readme = await fs.readFile(readmePath, "utf8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Markers not found in README.md");
  }

  const before = readme.slice(0, startIdx + START.length);
  const after = readme.slice(endIdx);
  const mid = `\n${top || "- (chưa có hoạt động gần đây)"}\n`;
  const updated = before + mid + after;

  if (updated !== readme) {
    await fs.writeFile(readmePath, updated, "utf8");
    console.log("README.md updated ✅");
  } else {
    console.log("No changes to README.md");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
