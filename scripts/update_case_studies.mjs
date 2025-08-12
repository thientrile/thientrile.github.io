// scripts/update_case_studies.mjs
import fs from "fs/promises";
import path from "path";

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");
const dir = path.join(repoRoot, "case-studies");

const START = "<!--CASE_STUDIES:START-->";
const END   = "<!--CASE_STUDIES:END-->";

const LIMIT = Number(process.env.CASE_STUDIES_LIMIT || 10);

function regexBetween(a, b) {
  return new RegExp(
    `${a.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}[\\s\\S]*?${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`
  );
}

function parseDateFromName(name) {
  // ví dụ: 2023-08-01-erp-pos.md → Date(2023-08-01)
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`).getTime();
}

async function listItems() {
  // Nếu thư mục không tồn tại → trả rỗng
  try { await fs.stat(dir); } catch { return []; }

  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".md"));
  const enriched = await Promise.all(files.map(async (file) => {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const firstLine = content.split("\n").find(l => l.trim().startsWith("#"));
    const title = (firstLine || file).replace(/^#\s*/, "").trim();
    const ts = parseDateFromName(file); // 0 nếu không có prefix ngày
    return { file, title, ts };
  }));

  enriched.sort((a, b) => b.ts - a.ts); // mới nhất lên trên
  const top = enriched.slice(0, LIMIT);

  return top.map(
    ({ file, title }) => `- [${title}](./case-studies/${encodeURIComponent(file)})`
  );
}

async function main() {
  const items = await listItems();
  const body = items.length ? items.join("\n") : "- (No case studies yet)";

  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes(START) || !readme.includes(END)) {
    throw new Error("Markers not found in README.md for case studies");
  }
  const block = `${START}\n${body}\n${END}`;
  readme = readme.replace(regexBetween(START, END), block);
  await fs.writeFile(readmePath, readme, "utf8");
  console.log(`Case studies updated: ${items.length} item(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
