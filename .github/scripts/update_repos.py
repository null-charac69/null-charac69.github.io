#!/usr/bin/env python3
"""Regenerate public-repos.json from the GitHub REST API (public data only)."""
import base64
import json
import os
import re
import sys
import urllib.error
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


def readme_summary(name):
    """First prose sentence(s) of a repo's README, for repos with no GitHub description."""
    try:
        data = fetch(f"https://api.github.com/repos/{USER}/{name}/readme")
        text = base64.b64decode(data.get("content", "")).decode("utf-8", "replace")
    except (urllib.error.URLError, ValueError, OSError):
        return ""
    # A title like "# Name - what it is" already says it best.
    title = re.search(r"^#\s+[^\n]+?\s+[-\u2013\u2014:]\s+([^\n]{12,})$", text, re.M)
    if title:
        return re.sub(r"[*_`]+", "", title.group(1)).strip()
    in_code = False
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code or not line or line[0] in "#-*>|![<=_" or line[0].isdigit():
            continue
        line = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", line)  # links -> text
        line = re.sub(r"[*_`]+", "", line).strip().rstrip(":")
        if len(line) < 25:
            continue
        first = re.match(r"(.{25,}?[.!?])\s", line + " ")
        if first:
            line = first.group(1)
        if len(line) > 170:
            cut = line[:170].rsplit(" ", 1)[0].rstrip(",;:")
            line = cut + "…"
        return line
    return ""


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
    for r in keep:
        if not (r["description"] or "").strip():
            r["summary"] = readme_summary(r["name"])

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
