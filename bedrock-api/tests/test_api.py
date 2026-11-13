import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import core  # noqa: E402
from ratelimit import RateLimiter  # noqa: E402


class NormaliseMessagesTests(unittest.TestCase):
    def test_merges_adjacent_roles(self):
        out = core._normalise_messages([
            {"role": "user", "content": "a"}, {"role": "user", "content": "b"},
        ])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["content"][0]["text"], "a\nb")

    def test_rejects_assistant_last(self):
        with self.assertRaises(ValueError):
            core._normalise_messages([
                {"role": "user", "content": "a"}, {"role": "assistant", "content": "b"},
            ])

    def test_rejects_overlong_message(self):
        with self.assertRaises(ValueError):
            core._normalise_messages([{"role": "user", "content": "x" * (core.MAX_MESSAGE_CHARS + 1)}])

    def test_output_tokens_are_capped(self):
        self.assertLessEqual(core.MAX_OUTPUT_TOKENS, 2048)


class RateLimiterTests(unittest.TestCase):
    def test_blocks_after_limit_and_recovers(self):
        now = [0.0]
        limiter = RateLimiter(2, 60, 100, clock=lambda: now[0])
        self.assertTrue(limiter.allow("ip"))
        self.assertTrue(limiter.allow("ip"))
        self.assertFalse(limiter.allow("ip"))
        self.assertTrue(limiter.allow("other"))
        now[0] = 61
        self.assertTrue(limiter.allow("ip"))

    def test_global_cap(self):
        limiter = RateLimiter(5, 60, 2, clock=lambda: 0.0)
        self.assertTrue(limiter.allow("a"))
        self.assertTrue(limiter.allow("b"))
        self.assertFalse(limiter.allow("c"))


if __name__ == "__main__":
    unittest.main()
