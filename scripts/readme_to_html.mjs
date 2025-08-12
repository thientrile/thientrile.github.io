// scripts/readme_to_html.mjs
import fs from "fs/promises";
import { marked } from "marked";

const README = "README.md";
const OUT = "index.html";

// (tuỳ chọn) cắt bớt section khi build web
function stripSections(md) {
  // ví dụ: bỏ Recent Activity nếu có
  return md.replace(/## 🧷[\s\S]*?<!--RECENT_ACTIVITY:END-->/, "");
}

function htmlShell(body) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Le Thien Tri | Profile</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-dark.min.css" media="(prefers-color-scheme: dark)">
<style>
:root{--max-w:980px}body{margin:0;background:#f6f8fa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
@media (prefers-color-scheme: dark){body{background:#0d1117}}
.wrap{max-width:var(--max-w);margin:32px auto;padding:16px}
.markdown-body{box-sizing:border-box;max-width:var(--max-w);margin:0 auto;padding:32px;border-radius:12px;background:#fff}
@media (prefers-color-scheme: dark){.markdown-body{background:#0b1220}}
</style></head><body>
<div class="wrap"><article class="markdown-body">
${body}
</article></div></body></html>`;
}

async function main() {
  const md = await fs.readFile(README, "utf8");
  const md2 = stripSections(md);          // hoặc dùng trực tiếp md
  const html = marked.parse(md2);
  await fs.writeFile(OUT, htmlShell(html), "utf8");
  console.log(`✔ Built ${OUT} from ${README}`);
}
main().catch(e => { console.error(e); process.exit(1); });
