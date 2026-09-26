"""python3 -m unittest discover -s .cursor/skills/loop-engineering/scripts"""
from __future__ import annotations

import unittest

from unaddressed_reviews import is_trusted_author, review_comments

MAJOR = "## コードレビュー結果\n\n### [Major] x"


def comment(body: str, association: str) -> dict:
    return {"body": body, "author_association": association, "created_at": "2026-01-01T00:00:00Z"}


class TrustedAuthorTest(unittest.TestCase):
    def test_repo_side_associations_are_trusted(self) -> None:
        for association in ("OWNER", "MEMBER", "COLLABORATOR"):
            self.assertTrue(is_trusted_author(comment(MAJOR, association)), association)

    def test_outside_associations_are_not_trusted(self) -> None:
        for association in ("NONE", "CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", ""):
            self.assertFalse(is_trusted_author(comment(MAJOR, association)), association)

    def test_missing_association_is_not_trusted(self) -> None:
        self.assertFalse(is_trusted_author({"body": MAJOR}))


class ReviewCommentsTest(unittest.TestCase):
    def test_keeps_only_trusted_review_comments(self) -> None:
        owner = comment(MAJOR, "OWNER")
        outsider = comment(MAJOR, "NONE")
        chatter = comment("ありがとうございます", "OWNER")
        self.assertEqual(review_comments([outsider, owner, chatter]), [owner])


if __name__ == "__main__":
    unittest.main()
