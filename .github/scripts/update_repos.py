#!/usr/bin/env python3
"""Regenerate public-repos.json from the GitHub REST API (public data only)."""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

USER = os.environ.get("GITHUB_USER", "null-charac69")
OUT = os.environ.get("OUT_FILE", "public-repos.json")


def fetch(url):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "portfolio-repo-index"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)


def main():
    repos, page = [], 1
    while True:
        batch = fetch(f"https://api.github.com/users/{USER}/repos?type=owner&per_page=100&page={page}&sort=pushed")
        repos += batch
        if len(batch) < 100:
            break
        page += 1

    keep = [
        {
            "name": r["name"],
            "html_url": r["html_url"],
            "description": r.get("description"),
            "language": r.get("language"),
            "stargazers_count": r.get("stargazers_count", 0),
            "pushed_at": r.get("pushed_at"),
            "topics": r.get("topics", []),
            "fork": bool(r.get("fork")),
        }
        for r in repos
        if not r.get("private") and not r.get("archived")
    ]
    keep.sort(key=lambda r: r["pushed_at"] or "", reverse=True)

    try:
        with open(OUT, encoding="utf-8") as fh:
            previous = json.load(fh)
    except (OSError, ValueError):
        previous = {}
    # This repo's own pushed_at changes with every index commit; keep the old
    # value so the workflow does not commit forever.
    old = {r["name"]: r for r in previous.get("repositories", [])}
    self_name = f"{USER}.github.io"
    if self_name in old:
        for r in keep:
            if r["name"] == self_name:
                r["pushed_at"] = old[self_name].get("pushed_at")
    if previous.get("repositories") == keep:
        print("No repository changes.")
        return 0  # keep old generatedAt so the workflow makes no empty commit

    payload = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "repositories": keep}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"Wrote {len(keep)} repositories.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
