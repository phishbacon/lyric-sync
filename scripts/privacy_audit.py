#!/usr/bin/env python3
"""Fail closed on likely private data in staged files or outgoing Git objects.

Uses Git's blob contents (never the working tree), so unstaged edits cannot
hide something that is about to be committed or pushed. Only rule names and
file paths are printed; possible secret values are never echoed.
"""

import re
import subprocess
import sys


ZERO_SHA = "0" * 40
MAX_BLOB_BYTES = 8 * 1024 * 1024

RULES = [
    ("private home directory", re.compile(r"/(?:home|Users)/[A-Za-z0-9_.-]+/")),
    ("Windows user directory", re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+", re.I)),
    ("private IPv4 address", re.compile(
        r"\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b"
    )),
    ("internal hostname", re.compile(r"\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:lan|local|internal)\b", re.I)),
    ("private key", re.compile(r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----")),
    ("known credential format", re.compile(
        r"\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[opurs]_[A-Za-z0-9]{30,}|"
        r"glpat-[A-Za-z0-9_-]{18,}|xox[baprs]-[A-Za-z0-9-]{15,}|"
        r"AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b"
    )),
    ("hard-coded credential", re.compile(
        r"(?i)\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|"
        r"password|passwd|x[_-]?plex[_-]?token)\b\s*[:=]\s*['\"]"
        r"(?!\$\{|\$[A-Za-z_]|<|your|example|placeholder|changeme|test|fixture|dummy)"
        r"[A-Za-z0-9_./+%=:-]{16,}['\"]"
    )),
    ("email address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
]

EXAMPLE_EMAIL_DOMAINS = {"example.com", "example.org", "example.net", "test.invalid"}


def git(*args, input_bytes=None):
    result = subprocess.run(
        ["git", *args], input=input_bytes, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False,
    )
    if result.returncode:
        raise RuntimeError(f"git {args[0]} failed; audit cannot safely proceed")
    return result.stdout


def sensitive_filename(path):
    name = path.rsplit("/", 1)[-1].lower()
    if name == ".env.example":
        return False
    if name == ".env" or name.startswith(".env."):
        return True
    if name in {"id_rsa", "id_ed25519", "auth.json", "credentials.json", "secrets.json"}:
        return True
    return name.endswith((".pem", ".p12", ".pfx", ".key", ".db", ".db-wal", ".sqlite", ".sqlite3"))


def findings(path, data):
    if sensitive_filename(path):
        yield "sensitive filename"
    if len(data) > MAX_BLOB_BYTES:
        yield "oversized blob requires manual review"
        return
    # Replace invalid UTF-8 bytes so unrelated binary segments cannot merge
    # into fake addresses. Embedded valid plaintext still gets checked.
    content = data.decode("utf-8", errors="replace")
    for name, pattern in RULES:
        for match in pattern.finditer(content):
            if name == "email address" and match.group().rsplit("@", 1)[-1].lower() in EXAMPLE_EMAIL_DOMAINS:
                continue
            # pnpm embeds public upstream package deprecation notices verbatim.
            # An email in such a notice is not a credential from this project.
            if name == "email address" and path == "pnpm-lock.yaml":
                line_start = content.rfind("\n", 0, match.start()) + 1
                if content[line_start:match.start()].lstrip().startswith("deprecated:"):
                    continue
            # This is a JavaScript network-interface property, not a hostname.
            if name == "internal hostname" and match.group().lower() == "address.internal":
                continue
            # Documentation can use obvious generic paths without exposing a real host.
            if name == "private home directory" and match.group().split("/")[2].lower() in {
                "user", "username", "your-user", "yourname", "example", "test", "alice", "bob"
            }:
                continue
            yield name
            break


def staged_blobs():
    for entry in git("ls-files", "--stage", "-z").split(b"\0"):
        if not entry:
            continue
        meta, path = entry.split(b"\t", 1)
        mode, sha, stage = meta.split()
        if stage == b"0" and mode != b"160000":
            yield sha.decode(), path.decode("utf-8", errors="replace")


def push_blobs(ref_lines):
    seen = set()
    for line in ref_lines.splitlines():
        parts = line.split()
        if len(parts) != 4:
            raise RuntimeError("unexpected pre-push input")
        _, local_sha, _, remote_sha = parts
        if local_sha == ZERO_SHA:  # deleting a branch sends no new objects
            continue
        args = ["rev-list", "--objects", local_sha]
        if remote_sha != ZERO_SHA:
            args.append("^" + remote_sha)
        # A newly created branch is checked in full, including ancestors.
        for entry in git(*args).splitlines():
            sha, _, path = entry.partition(b" ")
            if sha in seen or git("cat-file", "-t", sha.decode()).strip() != b"blob":
                continue
            seen.add(sha)
            yield sha.decode(), path.decode("utf-8", errors="replace")


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in {"staged", "push"}:
        print("usage: privacy_audit.py staged|push", file=sys.stderr)
        return 2
    try:
        blobs = staged_blobs() if sys.argv[1] == "staged" else push_blobs(sys.stdin.read())
        flagged = 0
        checked = 0
        for sha, path in blobs:
            checked += 1
            matches = list(dict.fromkeys(findings(path, git("cat-file", "blob", sha))))
            for rule in matches:
                print(f"privacy audit: {path}: {rule}", file=sys.stderr)
                flagged += 1
        if flagged:
            print(f"privacy audit BLOCKED: {flagged} finding(s) in {checked} Git blob(s)", file=sys.stderr)
            return 1
        print(f"privacy audit passed ({checked} Git blobs checked)")
        return 0
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"privacy audit ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
