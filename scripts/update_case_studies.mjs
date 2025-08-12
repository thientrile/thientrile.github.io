import fs from "fs/promises";
import path from "path";

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, "README.md");
const caseStudiesDir = path.join(repoRoot, "case-studies");

const START = "<!--CASE_STUDIES:START-->";
const END = "<!--CASE_STUDIES:END-->";

async function main() {
  const files = await fs.readdir(caseStudiesDir);
  const mdFiles = files.filter(f => f.endsWith(".md"));

  const items = await Promise.all(mdFiles.map(async file => {
    const filePath = path.join(caseStudiesDir, file);
    const content = await fs.readFile(filePath, "utf8");
    const firstLine = content.split("\n")[0].replace(/^# /, ""); // lấy tiêu đề
    return `- [${firstLine}](./case-studies/${file})`;
  }));

  let readme = await fs.readFile(readmePath, "utf8");
  const startIdx = readme.indexOf(START);
  const endIdx = readme.indexOf(END);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Markers not found in README.md");
  }

  const updated = readme.slice(0, startIdx + START.length)
    + "\n" + items.join("\n") + "\n"
    + readme.slice(endIdx);

  if (updated !== readme) {
    await fs.writeFile(readmePath, updated, "utf8");
    console.log("README updated with case studies ✅");
  } else {
    console.log("No changes in case studies");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
