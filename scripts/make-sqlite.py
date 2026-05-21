import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_JSON = ROOT / "data" / "questions.json"
DB_PATH = ROOT / "data" / "questions.sqlite"


def main() -> None:
    questions = json.loads(QUESTIONS_JSON.read_text(encoding="utf-8"))
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("drop table if exists questions")
        conn.execute(
            """
            create table questions (
                id text primary key,
                year integer not null,
                exam_system text not null,
                session text not null,
                subject text not null,
                major_no integer,
                middle_no text,
                minor_no text,
                answer_no text,
                unit text,
                keywords text,
                typicality text,
                summary text,
                answer text,
                points integer,
                correct_rate real,
                correct_rate_source_name text,
                correct_rate_source_url text,
                page text,
                pdf_path text,
                image_path text,
                notes text
            )
            """
        )
        conn.execute(
            """
            create virtual table questions_fts using fts5(
                id unindexed,
                subject,
                unit,
                keywords,
                summary,
                notes,
                tokenize = 'unicode61'
            )
            """
        )

        for q in questions:
            values = {
                **q,
                "keywords": " ".join(q.get("keywords", [])),
                "correct_rate_source_name": q.get("correct_rate_source_name"),
                "correct_rate_source_url": q.get("correct_rate_source_url"),
            }
            conn.execute(
                """
                insert into questions values (
                    :id, :year, :exam_system, :session, :subject, :major_no,
                    :middle_no, :minor_no, :answer_no, :unit, :keywords, :typicality,
                    :summary, :answer, :points, :correct_rate, :correct_rate_source_name,
                    :correct_rate_source_url, :page, :pdf_path, :image_path, :notes
                )
                """,
                values,
            )
            conn.execute(
                """
                insert into questions_fts (id, subject, unit, keywords, summary, notes)
                values (:id, :subject, :unit, :keywords, :summary, :notes)
                """,
                values,
            )

    print(f"created {DB_PATH}")


if __name__ == "__main__":
    main()
