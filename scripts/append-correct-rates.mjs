import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";

const sources = [
  {
    year: 2025,
    subject: "物理基礎",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2025/0326_1.pdf",
    rates: {
      101: 53.09,
      102: 13.5,
      103: 72.91,
      104: 29.77,
      105: 50.57,
      106: 74.0,
      107: 43.49,
      108: 51.41,
      109: 21.56,
      110: 68.32,
      111: 70.22,
      112: 69.27,
      113: 60.12,
      114: 58.9,
      115: 25.11,
    },
  },
  {
    year: 2025,
    subject: "物理",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2025/0326_1.pdf",
    rates: {
      1: 83.2,
      2: 86.93,
      3: 15.5,
      4: 18.31,
      5: 62.08,
      6: 76.76,
      7: 55.34,
      8: 77.99,
      9: 83.34,
      10: 46.17,
      11: 45.12,
      12: 72.23,
      13: 52.3,
      14: 78.51,
      15: 77.98,
      16: 50.86,
      17: 66.36,
      18: 45.55,
      19: 65.08,
      20: 63.83,
      21: 39.21,
      22: 46.98,
      23: 52.01,
      24: 46.13,
    },
  },
  {
    year: 2024,
    subject: "物理基礎",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2024/0321.pdf",
    rates: {
      1: 54.53,
      2: 47.98,
      3: 49.96,
      4: 67.78,
      5: 50.28,
      6: 43.4,
      7: 45.5,
      8: 72.67,
      9: 61.49,
      10: 59.22,
      11: 80.73,
      12: 80.73,
      13: 80.73,
      14: 61.9,
      15: 64.84,
      16: 63.34,
      17: 48.57,
    },
  },
  {
    year: 2024,
    subject: "物理",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2024/0321.pdf",
    rates: {
      1: 56.9,
      2: 81.57,
      3: 22.43,
      4: 38.03,
      5: 45.66,
      6: 68.36,
      7: 85.12,
      8: 80.75,
      9: 69.16,
      10: 64.7,
      11: 61.16,
      12: 41.18,
      13: 65.5,
      14: 86.05,
      15: 70.45,
      16: 78.51,
      17: 71.73,
      18: 61.5,
      19: 74.64,
      20: 43.63,
      21: 56.98,
      22: 45.94,
    },
  },
  {
    year: 2023,
    subject: "物理基礎",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2023/0701.pdf",
    rates: {
      1: 49.53,
      2: 36.75,
      3: 58.71,
      4: 59.49,
      5: 96.11,
      6: 54.28,
      7: 63.37,
      8: 49.39,
      9: 47.19,
      10: 59.62,
      11: 94.05,
      12: 83.31,
      13: 42.52,
      14: 35.05,
      15: 28.53,
      16: 59.68,
    },
  },
  {
    year: 2023,
    subject: "物理",
    sourceName: "旺文社教育情報センター",
    sourceUrl: "https://eic.obunsha.co.jp/file/exam_info/2023/0701.pdf",
    rates: {
      1: 89.19,
      2: 73.41,
      3: 24.16,
      4: 64.78,
      5: 50.0,
      6: 40.46,
      7: 79.43,
      8: 71.34,
      9: 48.29,
      10: 48.29,
      11: 48.29,
      12: 82.17,
      13: 59.32,
      14: 59.32,
      15: 43.74,
      16: 62.05,
      17: 78.05,
      18: 70.74,
      19: 65.76,
      20: 64.87,
      21: 62.24,
      22: 71.54,
      23: 59.97,
      24: 42.72,
      25: 76.31,
      26: 36.85,
    },
  },
  {
    year: 2021,
    subject: "物理",
    sourceName: "Z会共通テスト対策サイト",
    sourceUrl: "https://www.zkai.co.jp/kyotsu-test/result/butsuri-rate/",
    rates: {
      1: 89.5,
      2: 29.7,
      3: 84.4,
      4: 87.4,
      5: 74.4,
      6: 85.9,
      7: 55.8,
      8: 55.8,
      9: 55.8,
      10: 82.4,
      11: 63.3,
      12: 67.8,
      13: 67.8,
      14: 67.8,
      15: 54.8,
      16: 83.4,
      17: 64.3,
      18: 84.9,
      19: 91.0,
      20: 83.9,
      21: 82.9,
      22: 89.5,
      23: 39.7,
      24: 58.8,
      25: 88.4,
      26: 94.5,
      27: 68.3,
      28: 63.3,
    },
  },
];

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
let updated = 0;
const missing = [];

for (const source of sources) {
  const matched = questions.filter((question) => {
    return (
      question.year === source.year &&
      question.exam_system === "common" &&
      question.session === "main" &&
      question.subject === source.subject
    );
  });

  for (const question of matched) {
    const key = Number(question.answer_no);
    const rate = source.rates[key];
    if (rate == null) {
      missing.push(`${question.id}: answer_no ${question.answer_no}`);
      continue;
    }
    question.correct_rate = rate;
    question.correct_rate_source_name = source.sourceName;
    question.correct_rate_source_url = source.sourceUrl;
    updated += 1;
  }
}

writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);

console.log(`updated correct rates: ${updated}`);
if (missing.length) {
  console.log("missing rates:");
  for (const item of missing) console.log(`  ${item}`);
}
