import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cropsPath = join(root, "data", "image-crops.json");
const questionsPath = join(root, "data", "questions.json");
const tempDir = join(root, "data", "_tmp", "image-build");
const dryRun = process.argv.includes("--dry-run");

const tools = {
  pdftoppm: findCommand(["pdftoppm"]),
  convert: findCommand(["magick", "convert"]),
  identify: findCommand(["identify", "magick"]),
  cwebp: findCommand(["cwebp"]),
};

if (!existsSync(cropsPath)) {
  console.error("data/image-crops.json がありません。先に scripts/init-full-page-crops.mjs を実行してください。");
  process.exit(1);
}

const crops = JSON.parse(readFileSync(cropsPath, "utf8"));
const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
const selected = crops.filter((crop) => crop.question_id && crop.source_pdf && crop.page && crop.output);

console.log(`crop rows: ${selected.length}`);
if (dryRun) {
  console.log("dry run: image generation skipped");
  process.exit(0);
}

for (const [name, command] of Object.entries(tools)) {
  if (!command) {
    console.error(`${name} が見つかりません。Ubuntuなら poppler-utils imagemagick webp を入れてください。`);
    process.exit(1);
  }
}

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const outputByQuestion = new Map();
let built = 0;
let skipped = 0;

for (const crop of selected) {
  const sourcePdf = join(root, crop.source_pdf);
  const outputPath = join(root, crop.output);
  if (!existsSync(sourcePdf)) {
    console.warn(`skip missing PDF: ${crop.source_pdf}`);
    skipped += 1;
    continue;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  const pagePng = renderPage(sourcePdf, Number(crop.page), crop.question_id);
  const { width, height } = identifyImage(pagePng);
  const box = resolveCropBox(crop.box, width, height);
  const cropPng = join(tempDir, `${safeName(crop.question_id)}-${crop.page}-crop.png`);

  runImageMagick([
    pagePng,
    "-colorspace",
    "Gray",
    "-crop",
    `${box.width}x${box.height}+${box.x}+${box.y}`,
    "+repage",
    "-resize",
    "1500x1500>",
    "-strip",
    cropPng,
  ]);
  run(tools.cwebp, ["-quiet", "-q", "68", "-m", "6", cropPng, "-o", outputPath]);

  const relativeOutput = normalizePath(crop.output);
  if (!outputByQuestion.has(crop.question_id)) outputByQuestion.set(crop.question_id, []);
  outputByQuestion.get(crop.question_id).push(relativeOutput);
  built += 1;
}

for (const question of questions) {
  const outputs = outputByQuestion.get(question.id);
  if (!outputs || outputs.length === 0) continue;
  question.image_paths = outputs;
  question.image_path = outputs[0];
}

writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
console.log(`built images: ${built}`);
console.log(`skipped rows: ${skipped}`);
console.log(`updated questions: ${outputByQuestion.size}`);

function findCommand(candidates) {
  for (const candidate of candidates) {
    const lookup = process.platform === "win32"
      ? spawnSync("where.exe", [candidate], { encoding: "utf8" })
      : spawnSync("which", [candidate], { encoding: "utf8" });
    if (lookup.status === 0) return candidate;
  }
  return "";
}

function renderPage(sourcePdf, page, questionId) {
  const prefix = join(tempDir, `${safeName(questionId)}-${page}`);
  run(tools.pdftoppm, ["-f", String(page), "-l", String(page), "-r", "160", "-png", sourcePdf, prefix]);
  const output = `${prefix}-${page}.png`;
  if (!existsSync(output)) {
    throw new Error(`pdftoppmの出力が見つかりません: ${output}`);
  }
  return output;
}

function identifyImage(path) {
  const command = tools.identify;
  const args = command === "magick"
    ? ["identify", "-format", "%w %h", path]
    : ["-format", "%w %h", path];
  const result = run(command, args, { capture: true });
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);
  if (!width || !height) throw new Error(`画像サイズを取得できません: ${path}`);
  return { width, height };
}

function runImageMagick(args) {
  if (tools.convert === "magick") {
    run("magick", args);
  } else {
    run(tools.convert, args);
  }
}

function resolveCropBox(box, imageWidth, imageHeight) {
  if (!box) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }

  const x = Math.max(0, Math.round(Number(box.x) * imageWidth));
  const y = Math.max(0, Math.round(Number(box.y) * imageHeight));
  const width = Math.min(imageWidth - x, Math.round(Number(box.width) * imageWidth));
  const height = Math.min(imageHeight - y, Math.round(Number(box.height) * imageHeight));
  if (width <= 0 || height <= 0) {
    throw new Error(`不正なcrop boxです: ${JSON.stringify(box)}`);
  }
  return { x, y, width, height };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stderr || result.stdout}`);
  }
  if (options.capture) return result;
  return result;
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizePath(path) {
  return path.split(/[\\/]+/).join("/");
}
