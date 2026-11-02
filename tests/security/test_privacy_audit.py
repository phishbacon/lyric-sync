"""Exercise the privacy hooks with real Git staging and outgoing history."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


AUDITOR = Path(__file__).resolve().parents[2] / "scripts" / "privacy_audit.py"


class PrivacyAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.repo = Path(self.temp_dir.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Privacy Audit Test")
        self.git("config", "user.email", "audit@example.com")
        self.write("README.md", "harmless content\n")
        self.commit()

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.repo, capture_output=True, check=True,
        ).stdout.decode().strip()

    def write(self, filename, content):
        path = self.repo / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def commit(self):
        self.git("add", "-A")
        self.git("commit", "-qm", "test commit")
        return self.git("rev-parse", "HEAD")

    def audit(self, mode, stdin=""):
        return subprocess.run(
            [sys.executable, str(AUDITOR), mode], input=stdin, text=True,
            cwd=self.repo, capture_output=True,
        )

    def test_staged_audit_reads_index_instead_of_working_tree(self):
        private_ip = ".".join(("10", "7", "8", "9"))
        self.write("app.txt", f"host={private_ip}\n")
        self.git("add", "app.txt")
        self.write("app.txt", "sanitized working tree\n")
        result = self.audit("staged")
        self.assertEqual(result.returncode, 1)
        self.assertIn("private IPv4 address", result.stderr)
        self.assertNotIn(private_ip, result.stderr)

    def test_private_files_block_even_without_secret_values(self):
        self.write("config/.env.production", "harmless\n")
        self.git("add", "config/.env.production")
        result = self.audit("staged")
        self.assertEqual(result.returncode, 1)
        self.assertIn("sensitive filename", result.stderr)

    def test_push_audits_a_deleted_secret_from_older_commits(self):
        baseline = self.git("rev-parse", "HEAD")
        private_path = "/".join(("", "home", "privateuser", "music", "track.flac"))
        self.write("config.txt", private_path)
        self.commit()
        self.git("rm", "config.txt")
        self.commit()
        tip = self.git("rev-parse", "HEAD")
        result = self.audit("push", f"refs/heads/main {tip} refs/heads/main {baseline}\n")
        self.assertEqual(result.returncode, 1)
        self.assertIn("private home directory", result.stderr)
        self.assertNotIn(private_path, result.stderr)

    def test_clean_push_passes(self):
        baseline = self.git("rev-parse", "HEAD")
        self.write("new.txt", "safe contents\n")
        tip = self.commit()
        result = self.audit("push", f"refs/heads/main {tip} refs/heads/main {baseline}\n")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_detects_windows_home_directories(self):
        path = "C:" + "\\".join(("", "Users", "privateuser", "Documents"))
        self.write("config.txt", path)
        self.git("add", "config.txt")
        result = self.audit("staged")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("Windows user directory", result.stderr)


if __name__ == "__main__":
    unittest.main()
