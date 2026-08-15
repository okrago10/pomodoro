#!/usr/bin/env python3
"""List unaddressed コードレビュー / セキュリティレビュー comments on open PRs.

A review comment is unaddressed when it is newer than the PR head commit.
Exit 4 if GitHub cannot be queried (fail closed). Exit 0 otherwise.
"""
from __future__ import annotations

import json
import subprocess
import sys


def gh_json(args: list[str]) -> object:
    try:
        raw = subprocess.check_output(["gh", *args], text=True)
    except subprocess.CalledProcessError as exc:
        print("decision=GH_ERROR")
        print("gh failed:", " ".join(args), file=sys.stderr)
        raise SystemExit(4) from exc
    return json.loads(raw)


def main() -> int:
    repo = gh_json(["repo", "view", "--json", "nameWithOwner"])
    if not isinstance(repo, dict):
        print("decision=GH_ERROR")
        return 4
    name = repo["nameWithOwner"]
    prs = gh_json(["pr", "list", "--state", "open", "--json", "number,url,headRefOid,title"])
    if not isinstance(prs, list):
        print("decision=GH_ERROR")
        return 4

    unaddressed: list[int] = []
    waiting: list[int] = []
    for pr in prs:
        n = pr["number"]
        comments = gh_json(["api", f"repos/{name}/issues/{n}/comments"])
        commit = gh_json(["api", f"repos/{name}/commits/{pr['headRefOid']}"])
        if not isinstance(comments, list) or not isinstance(commit, dict):
            print("decision=GH_ERROR")
            return 4
        head = commit["commit"]["committer"]["date"]
        reviews = [
            c
            for c in comments
            if str(c.get("body") or "").startswith("## コードレビュー結果")
            or str(c.get("body") or "").startswith("## セキュリティレビュー結果")
        ]
        if not reviews:
            print(f"pr #{n} {pr.get('url', '')} no-review-yet")
            waiting.append(n)
            continue
        latest = max(reviews, key=lambda c: str(c.get("created_at") or ""))
        body = str(latest.get("body") or "")
        has_major = "### [Major]" in body
        has_minor = "### [Minor]" in body
        clean = "指摘なし" in body and not has_major and not has_minor
        newer = str(latest.get("created_at") or "") > head
        status = "unaddressed" if newer and not clean else "ok"
        print(
            f"pr #{n} {pr.get('url', '')} review={status} "
            f"created={latest.get('created_at')} head={head} "
            f"major={has_major} minor={has_minor} clean={clean}"
        )
        if newer and (has_major or has_minor) and not clean:
            unaddressed.append(n)

    print("unaddressed_prs=" + ",".join(str(x) for x in unaddressed))
    print("waiting_for_review_prs=" + ",".join(str(x) for x in waiting))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
