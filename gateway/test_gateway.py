"""ทดสอบ Gateway โดยไม่ต้องมี PLC หรือ Supabase จริง:  python -m unittest -v"""

import unittest

from plc_gateway import Gateway, GatewayConfig, plc_to_machine_status


class FakeRest:
    def __init__(self, plc_linked=True):
        self.calls = []
        self.plc_linked = plc_linked
        self.alarm_exists = False
        self.fail_next_post = False

    def request(self, method, path, body=None, prefer=""):
        self.calls.append((method, path, body))
        if method == "GET":
            return 200, [{"id": "m-1", "plc_linked": self.plc_linked}]
        if method == "PATCH":
            return 204, None
        if method == "POST":
            if self.fail_next_post:
                self.fail_next_post = False
                return 503, "unavailable"
            if self.alarm_exists:
                return 409, {"code": "23505"}
            self.alarm_exists = True
            return 201, None
        raise AssertionError(method)

    def posts(self):
        return [c for c in self.calls if c[0] == "POST"]


def make(bits, rest):
    cfg = GatewayConfig(supabase_url="http://x", service_role_key="k")
    return Gateway(cfg, lambda d: bits[d], rest)


class MappingTest(unittest.TestCase):
    def test_mapping(self):
        self.assertEqual(plc_to_machine_status(1, 1, 1), "alarm")
        self.assertEqual(plc_to_machine_status(1, 1, 0), "running")
        self.assertEqual(plc_to_machine_status(0, 1, 0), "stop")
        self.assertEqual(plc_to_machine_status(1, 0, 0), "stop")


class GatewayTest(unittest.TestCase):
    def test_running_updates_status_without_alarm(self):
        rest = FakeRest()
        gw = make({"M0": 1, "M1": 1, "M3": 0}, rest)
        self.assertEqual(gw.cycle(), "running")
        self.assertEqual(rest.posts(), [])
        patch = [c for c in rest.calls if c[0] == "PATCH"][0]
        self.assertEqual(patch[2]["status"], "running")
        self.assertIn("plc_linked=eq.true", patch[1])

    def test_alarm_created_once_on_rising_edge(self):
        rest = FakeRest()
        bits = {"M0": 1, "M1": 1, "M3": 0}
        gw = make(bits, rest)
        gw.cycle()
        bits["M3"] = 1
        self.assertEqual(gw.cycle(), "alarm")
        gw.cycle()
        gw.cycle()
        self.assertEqual(len(rest.posts()), 1)
        self.assertEqual(rest.posts()[0][2]["source"], "plc")

    def test_alarm_retried_after_network_failure(self):
        rest = FakeRest()
        rest.fail_next_post = True
        gw = make({"M0": 1, "M1": 0, "M3": 1}, rest)
        gw.cycle()
        self.assertTrue(gw.pending_alarm)
        gw.cycle()
        self.assertFalse(gw.pending_alarm)
        self.assertEqual(gw.stats["alarms"], 1)

    def test_existing_open_alarm_is_not_duplicated(self):
        rest = FakeRest()
        rest.alarm_exists = True  # เช่น Gateway รีสตาร์ทระหว่างที่ ERR ยังติดอยู่
        gw = make({"M0": 1, "M1": 1, "M3": 1}, rest)
        gw.cycle()
        self.assertFalse(gw.pending_alarm)
        self.assertEqual(gw.stats["alarms"], 0)

    def test_plc_read_failure_does_not_touch_supabase(self):
        rest = FakeRest()
        cfg = GatewayConfig(supabase_url="http://x", service_role_key="k")

        def broken(_):
            raise RuntimeError("offline")

        gw = Gateway(cfg, broken, rest)
        self.assertIsNone(gw.cycle())
        self.assertEqual(rest.calls, [])

    def test_machine_not_linked_is_skipped(self):
        rest = FakeRest(plc_linked=False)
        gw = make({"M0": 1, "M1": 1, "M3": 0}, rest)
        self.assertIsNone(gw.cycle())
        self.assertFalse(any(c[0] == "PATCH" for c in rest.calls))


if __name__ == "__main__":
    unittest.main()
