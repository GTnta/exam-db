import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const outPath = path.join(root, 'worklogs', 'image-metadata-audit.json');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));

const cropsByQuestion = new Map();
for (const crop of crops) {
  if (!cropsByQuestion.has(crop.question_id)) cropsByQuestion.set(crop.question_id, []);
  cropsByQuestion.get(crop.question_id).push(crop);
}

const findings = [];
let fullPagePlaceholders = 0;
let missingOutputFiles = 0;
let pageOneOrTwoDisplay = 0;
let pdfPageOneOrTwo = 0;
let unavailableImages = 0;

for (const question of questions) {
  const questionCrops = cropsByQuestion.get(question.id) ?? [];
  const imagePaths = question.image_paths?.length ? question.image_paths : question.image_path ? [question.image_path] : [];
  const intentionallyUnavailable = question.image_status === 'unavailable-small-crop';
  if (intentionallyUnavailable) unavailableImages += 1;

  if (!questionCrops.length && !intentionallyUnavailable) {
    findings.push({ id: question.id, type: 'missing_crop_metadata' });
  }

  if (!imagePaths.length && !intentionallyUnavailable) {
    findings.push({ id: question.id, type: 'missing_question_image_path' });
  }

  for (const imagePath of imagePaths) {
    if (!fs.existsSync(path.join(root, imagePath))) {
      missingOutputFiles += 1;
      findings.push({ id: question.id, type: 'missing_image_file', image_path: imagePath });
    }
  }

  if (/^(1|2|1-2)$/.test(String(question.page ?? ''))) {
    pageOneOrTwoDisplay += 1;
  }

  for (const crop of questionCrops) {
    if (crop.status === 'full-page-placeholder' || !crop.box) fullPagePlaceholders += 1;
    if (Number(crop.pdf_page) <= 2) pdfPageOneOrTwo += 1;
    if (Number(crop.pdf_page) <= 2 && Number(crop.page) <= 2) {
      findings.push({
        id: question.id,
        type: 'possible_cover_or_instruction_page',
        page: crop.page,
        pdf_page: crop.pdf_page,
        output: crop.output,
      });
    }
  }
}

const report = {
  created_at: new Date().toISOString(),
  question_count: questions.length,
  crop_rows: crops.length,
  questions_with_crop_metadata: cropsByQuestion.size,
  unavailable_images: unavailableImages,
  full_page_placeholder_rows: fullPagePlaceholders,
  missing_output_files: missingOutputFiles,
  questions_displaying_page_1_or_2: pageOneOrTwoDisplay,
  crop_rows_with_pdf_page_1_or_2: pdfPageOneOrTwo,
  findings_count: findings.length,
  findings,
};

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`questions=${report.question_count}`);
console.log(`crop_rows=${report.crop_rows}`);
console.log(`questions_with_crop_metadata=${report.questions_with_crop_metadata}`);
console.log(`unavailable_images=${report.unavailable_images}`);
console.log(`full_page_placeholder_rows=${report.full_page_placeholder_rows}`);
console.log(`missing_output_files=${report.missing_output_files}`);
console.log(`questions_displaying_page_1_or_2=${report.questions_displaying_page_1_or_2}`);
console.log(`crop_rows_with_pdf_page_1_or_2=${report.crop_rows_with_pdf_page_1_or_2}`);
console.log(`findings=${report.findings_count}`);
console.log(`report=${path.relative(root, outPath)}`);
