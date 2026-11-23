"""SC terminology module regression checks (stdlib only)."""
import json
import re
import unittest
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "sc-vocab"


def normalized(value):
    # Mirrors JavaScript's intended conservative NFKC/lower/punctuation normalization.
    return "".join(ch for ch in unicodedata.normalize("NFKC", value).lower()
                   if not ch.isspace() and not unicodedata.category(ch).startswith(("P", "S")))


class SCVocabularyRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((DATA / "manifest.json").read_text())
        cls.sets = [json.loads((DATA / f"sc-vocab-questions-set{i:02d}.json").read_text()) for i in range(1, 5)]
        cls.questions = [q for bucket in cls.sets for q in bucket["questions"]]
        cls.related = json.loads((DATA / "sc-vocab-related-answer-policy.json").read_text())
        cls.master = json.loads((ROOT / "qa/sc-vocab/sc-vocab-master.json").read_text())

    def test_200_unique_questions_and_terms(self):
        self.assertEqual(len(self.questions), 200)
        self.assertEqual([q["questionId"] for q in self.questions],
                         [f"sc-vocab-q{i:03d}" for i in range(1, 201)])
        self.assertEqual(len({q["termId"] for q in self.questions}), 200)
        self.assertEqual(len(self.master["terms"]), 200)
        for index, batch in enumerate(self.sets, start=1):
            self.assertEqual(len(batch["questions"]), 50)
            self.assertEqual(batch["setNo"], index)
            self.assertEqual([q["order"] for q in batch["questions"]], list(range(1, 51)))
            from collections import Counter
            self.assertEqual(Counter(q["difficulty"] for q in batch["questions"]),
                             Counter({"basic": 15, "standard": 25, "advanced": 10}))

    def test_master_and_alias_policy_alignment(self):
        by_id = {t["id"]: t for t in self.master["terms"]}
        for q in self.questions:
            t = by_id[q["termId"]]
            for a, b in [(q["answer"], t["term"]),
                         (q["acceptedAnswers"], t["acceptedAnswers"]),
                         (q["category"], t["category"]),
                         (q["difficulty"], t["difficulty"]),
                         (q["referenceUrls"], t["referenceUrls"])]:
                self.assertEqual(a, b, q["questionId"])
            self.assertIn(q["answer"], q["acceptedAnswers"])
        self.assertEqual({p["questionId"] for p in self.related["items"]},
                         {q["questionId"] for q in self.questions})

    def test_no_cross_question_alias_collision(self):
        owners = {}
        for q in self.questions:
            for alias in q["acceptedAnswers"]:
                key = normalized(alias)
                self.assertTrue(key)
                previous = owners.setdefault(key, q["questionId"])
                self.assertEqual(previous, q["questionId"], (alias, previous, q["questionId"]))

    def test_no_prompt_answer_leaks(self):
        for q in self.questions:
            question = normalized(q["prompt"])
            for alias in q["acceptedAnswers"]:
                key = normalized(alias)
                if len(key) >= 3:
                    self.assertNotIn(key, question, (q["questionId"], alias))

    def test_high_risk_alias_policy(self):
        by_q = {q["questionId"]: q for q in self.questions}
        by_r = {r["questionId"]: r for r in self.related["items"]}
        self.assertIn("ダイナミックパケットフィルタリング", by_q["sc-vocab-q009"]["acceptedAnswers"])
        self.assertIn("リフレクション攻撃", by_r["sc-vocab-q127"]["relatedAnswers"])
        self.assertNotIn("リフレクション攻撃", by_q["sc-vocab-q127"]["acceptedAnswers"])
        self.assertIn("検疫ネットワーク", by_r["sc-vocab-q189"]["relatedAnswers"])
        self.assertNotIn("検疫ネットワーク", by_q["sc-vocab-q189"]["acceptedAnswers"])
        self.assertIn("動的ヒューリスティック法", by_r["sc-vocab-q196"]["relatedAnswers"])
        self.assertIn("不正指令電磁的記録作成等罪", by_q["sc-vocab-q099"]["acceptedAnswers"])

    def test_portal_and_new_page_are_linked(self):
        portal = (ROOT / "index.html").read_text()
        page = (ROOT / "sc/vocab.html").read_text()
        self.assertIn('href="sc/vocab.html"', portal)
        for path in ["../assets/style.css", "../assets/sc-vocab.css", "../assets/sc-vocab.js"]:
            self.assertIn(path, page)
            self.assertTrue((ROOT / "sc" / path).exists(), path)
        self.assertEqual(len(self.manifest["sets"]), 4)
        self.assertEqual(self.manifest["totalQuestions"], 200)


if __name__ == "__main__":
    unittest.main()
