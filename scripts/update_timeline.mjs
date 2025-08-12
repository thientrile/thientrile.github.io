// scripts/update_timeline.mjs
import fs from "fs/promises";
import path from "path";

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");
const dataPath = path.join(repoRoot, "data", "timeline.json");
const casesDir = path.join(repoRoot, "case-studies");

const START = "<!--TIMELINE:START-->";
const END   = "<!--TIMELINE:END-->";

function regexBetween(a, b) {
  return new RegExp(
    `${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
  );
}

function parseDateFromName(name) {
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

async function loadJsonEvents() {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function loadCaseStudyEvents() {
  try { await fs.stat(casesDir); } catch { return []; }
  const files = (await fs.readdir(casesDir)).filter(f => f.endsWith(".md"));
  const events = [];
  for (const file of files) {
    const date = parseDateFromName(file);
    const full = path.join(casesDir, file);
    const content = await fs.readFile(full, "utf8");
    const firstLine = content.split("\n").find(l => l.trim().startsWith("#"));
    const title = (firstLine || file).replace(/^#\s*/, "").trim();
    if (date) {
      events.push({
        date,
        title,
        details: "Case study",
        link: `./case-studies/${encodeURIComponent(file)}`,
        icon: "📄"
      });
    }
  }
  return events;
}

function toTs(d) { return new Date(d + "T00:00:00Z").getTime(); }

function groupByYear(events) {
  const map = new Map();
  for (const ev of events) {
    const y = ev.date.slice(0, 4);
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(ev);
  }
  return [...map.entries()]
    .sort((a,b) => Number(b[0]) - Number(a[0])) // year desc
    .map(([year, items]) => ({ year, items }));
}

function renderTimeline(events) {
  if (!events.length) return "- (No timeline items yet)";
  // sort desc by date
  events.sort((a,b) => toTs(b.date) - toTs(a.date));
  const groups = groupByYear(events);
  const lines = [];
  for (const g of groups) {
    lines.push(`### ${g.year}`);
    for (const ev of g.items) {
      const icon = ev.icon || "🧩";
      const title = ev.link ? `[${ev.title}](${ev.link})` : ev.title;
      lines.push(`- ${icon} **${ev.date}** — ${title}${ev.details ? ` — _${ev.details}_` : ""}`);
    }
    lines.push(""); // blank line between years
  }
  return lines.join("\n").trim();
}

async function main() {
  const jsonEvents = await loadJsonEvents();
  const caseEvents = await loadCaseStudyEvents();

  // merge (ưu tiên JSON nếu trùng [date+title])
  const key = ev => `${ev.date}::${ev.title}`;
  const map = new Map();
  for (const e of [...caseEvents, ...jsonEvents]) map.set(key(e), e);
  const all = [...map.values()];

  const body = renderTimeline(all);

  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes(START) || !readme.includes(END)) {
    throw new Error("Markers not found in README.md for TIMELINE");
  }
  const block = `${START}\n${body}\n${END}`;
  readme = readme.replace(regexBetween(START, END), block);
  await fs.writeFile(readmePath, readme, "utf8");

  console.log(`Timeline updated: ${all.length} item(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
