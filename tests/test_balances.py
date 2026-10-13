import unittest
import json
from unittest.mock import MagicMock, patch
import sys

# Mocking GenLayer dependencies
mock_gl = MagicMock()
sys.modules['genlayer'] = mock_gl
mock_gl.Address = lambda x: str(x)
mock_gl.u256 = lambda x: int(x)
mock_gl.gl = mock_gl

class DummyRecipient:
    def __init__(self, addr):
        self.addr = addr
    def emit_transfer(self, value, on):
        TestContractPaths.transfers.append((self.addr, value))

mock_gl.evm.contract_interface = lambda cls: cls
mock_gl.public.write = lambda f: f
mock_gl.public.write.payable = lambda f: f
mock_gl.public.view = lambda f: f
mock_gl.Contract = object
mock_gl.message.sender_address = "auditor_addr"
mock_gl.message.value = 0

# Need a fake TreeMap
class FakeTreeMap(dict):
    pass

sys.modules['genlayer'].TreeMap = FakeTreeMap

# Now we can import the contract
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from contracts.sentinel import Sentinelpy, _Recipient

# Override _Recipient
import contracts.sentinel
contracts.sentinel._Recipient = DummyRecipient

class TestContractPaths(unittest.TestCase):
    transfers = []

    def setUp(self):
        TestContractPaths.transfers = []
        self.contract = Sentinelpy()
        self.contract.projects = FakeTreeMap()
        self.contract.project_balances = FakeTreeMap()
        self.contract.audits = FakeTreeMap()
        self.contract.researchers = FakeTreeMap()
        self.contract.researcher_indices = FakeTreeMap()
        
        # Setup mock sender
        mock_gl.message.sender_address = "sponsor_addr"
        mock_gl.message.value = int(5.0 * 10**18)
        self.proj_id = self.contract.register_project("https://raw.githubusercontent.com/user/repo/0123456789abcdef0123456789abcdef01234567/file.py", "fakehash")
        
        # Mock web fetch
        self.fake_source = "function vulnerable() { hack(); }"
        mock_gl.eq_principle.strict_eq.return_value = self.fake_source
        
        # Mock hashlib
        self.patcher = patch('contracts.sentinel.hashlib.sha256')
        self.mock_sha256 = self.patcher.start()
        self.mock_sha256.return_value.hexdigest.return_value = "fakehash"

    def tearDown(self):
        self.patcher.stop()

    def test_unused_pool_withdrawal(self):
        mock_gl.message.sender_address = "sponsor_addr"
        self.contract.close_project(self.proj_id)
        
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "sponsor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(5.0 * 10**18))
        
        proj = json.loads(self.contract.projects[self.proj_id])
        self.assertEqual(proj["status"], "CLOSED")
        self.assertEqual(self.contract.project_balances[self.proj_id], 0)

    def test_overpayment_and_error(self):
        mock_gl.message.sender_address = "auditor_addr"
        overpayment_wei = int(0.5 * 10**18)
        mock_gl.message.value = overpayment_wei
        audit_id = self.contract.submit_audit(self.proj_id, 'fake report', 1, 1)
        
        # Cause a fetch error by changing hash
        self.mock_sha256.return_value.hexdigest.return_value = "badhash"
        
        print("EXEC OUT:", self.contract.execute_audit(audit_id))
        
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], overpayment_wei)

    def test_malicious_critical_solvent_pool(self):
        mock_gl.message.sender_address = "auditor_addr"
        stake_wei = int(0.1 * 10**18)
        mock_gl.message.value = stake_wei
        audit_id = self.contract.submit_audit(self.proj_id, 'fake report', 1, 1)
        
        # Mock AI response with CRITICAL severity (2.0 GEN bounty)
        ai_resp = json.dumps({
            "decision": "MALICIOUS",
            "severity": "CRITICAL",
            "vulnerability_type": "Hack",
            "evidence_line_snippet": "function vulnerable() { hack(); }",
            "reasoning": "bad"
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = ai_resp
        
        print("EXEC OUT:", self.contract.execute_audit(audit_id))
        
        # Should payout auditor (2.0 bounty + 0.1 stake) and refund sponsor (3.0 remaining)
        self.assertEqual(len(TestContractPaths.transfers), 2)
        
        # Auditor payout
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(2.0 * 10**18) + int(0.1 * 10**18))
        
        # Sponsor refund
        self.assertEqual(TestContractPaths.transfers[1][0], "sponsor_addr")
        self.assertEqual(TestContractPaths.transfers[1][1], int(3.0 * 10**18))
        self.assertEqual(self.contract.project_balances[self.proj_id], 0)
        
        # Project marked COMPROMISED
        proj = json.loads(self.contract.projects[self.proj_id])
        self.assertEqual(proj["status"], "COMPROMISED")

    def test_malicious_high_severity_active_pool(self):
        mock_gl.message.sender_address = "auditor_addr"
        stake_wei = int(0.1 * 10**18)
        mock_gl.message.value = stake_wei
        audit_id = self.contract.submit_audit(self.proj_id, 'fake report', 1, 1)
        
        # Mock AI response with HIGH severity (1.0 GEN bounty)
        ai_resp = json.dumps({
            "decision": "MALICIOUS",
            "severity": "HIGH",
            "vulnerability_type": "Reentrancy",
            "evidence_line_snippet": "function vulnerable() { hack(); }",
            "reasoning": "high severity finding"
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = ai_resp
        
        self.contract.execute_audit(audit_id)
        
        # Should payout auditor (1.0 bounty + 0.1 stake) ONLY
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(1.0 * 10**18) + int(0.1 * 10**18))
        
        # Project must remain ACTIVE!
        proj = json.loads(self.contract.projects[self.proj_id])
        self.assertEqual(proj["status"], "ACTIVE")
        # Pool balance decremented: 5.0 - 1.0 = 4.0 GEN
        self.assertEqual(self.contract.project_balances[self.proj_id], int(4.0 * 10**18))
        
        # Verify researcher record
        leaderboard = json.loads(self.contract.get_leaderboard())
        self.assertEqual(len(leaderboard), 1)
        self.assertEqual(leaderboard[0]["address"], "auditor_addr")
        self.assertEqual(leaderboard[0]["total_earned_wei"], int(1.0 * 10**18))
        self.assertEqual(leaderboard[0]["high_count"], 1)

    def test_top_up_pool(self):
        mock_gl.message.sender_address = "sponsor_addr"
        mock_gl.message.value = int(2.5 * 10**18)
        res = self.contract.top_up_pool(self.proj_id)
        self.assertTrue("Pool topped up successfully" in res)
        # New balance: 5.0 + 2.5 = 7.5 GEN
        self.assertEqual(self.contract.project_balances[self.proj_id], int(7.5 * 10**18))

    def test_malicious_underfunded_pool(self):
        # Create underfunded project
        mock_gl.message.sender_address = "sponsor_addr"
        mock_gl.message.value = int(0.5 * 10**18)
        uf_proj_id = self.contract.register_project("https://raw.githubusercontent.com/user/repo/0123456789abcdef0123456789abcdef01234567/file2.py", "fakehash")
        
        mock_gl.message.sender_address = "auditor_addr"
        stake_wei = int(0.1 * 10**18)
        mock_gl.message.value = stake_wei
        audit_id = self.contract.submit_audit(uf_proj_id, 'fake report', 1, 1)
        
        ai_resp = json.dumps({
            "decision": "MALICIOUS",
            "severity": "CRITICAL",
            "vulnerability_type": "Hack",
            "evidence_line_snippet": "function vulnerable() { hack(); }",
            "reasoning": "bad"
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = ai_resp
        
        print("EXEC OUT:", self.contract.execute_audit(audit_id))
        
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(0.6 * 10**18))
        self.assertEqual(self.contract.project_balances[uf_proj_id], 0)

    def test_secure_false_alarm(self):
        mock_gl.message.sender_address = "auditor_addr"
        stake_wei = int(0.1 * 10**18)
        mock_gl.message.value = stake_wei
        audit_id = self.contract.submit_audit(self.proj_id, 'fake report', 1, 1)
        
        ai_resp = json.dumps({
            "decision": "SECURE",
            "severity": "NONE",
            "vulnerability_type": "None",
            "evidence_line_snippet": "None",
            "reasoning": "looks good"
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = ai_resp
        
        print("EXEC OUT:", self.contract.execute_audit(audit_id))
        
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "0x0000000000000000000000000000000000000000")
        self.assertEqual(TestContractPaths.transfers[0][1], stake_wei)
        self.assertEqual(self.contract.project_balances[self.proj_id], int(5.0 * 10**18))

    def test_close_project_pending_audits_blocked(self):
        mock_gl.message.sender_address = "auditor_addr"
        mock_gl.message.value = int(0.1 * 10**18)
        self.contract.submit_audit(self.proj_id, 'fake report', 1, 1)
        mock_gl.message.sender_address = "sponsor_addr"
        with self.assertRaisesRegex(Exception, "Cannot close project while audits are pending"):
            self.contract.close_project(self.proj_id)

    def test_audit_execution_closed_project_blocked(self):
        mock_gl.message.sender_address = "sponsor_addr"
        self.contract.close_project(self.proj_id)
        mock_gl.message.sender_address = "auditor_addr"
        mock_gl.message.value = int(0.1 * 10**18)
        audit_id = self.contract.audit_counter
        self.contract.audits[audit_id] = json.dumps({'project_id': str(self.proj_id), 'status': 'Pending', 'payout_status': 'Pending', 'analysis': '', 'submitter': 'auditor_addr', 'stake': str(int(0.1 * 10**18))})
        self.contract.audit_counter += 1
        self.contract.execute_audit(audit_id)
        self.assertEqual(len(TestContractPaths.transfers), 2)
        self.assertEqual(TestContractPaths.transfers[1][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[1][1], int(0.1 * 10**18))

    def test_audit_execution_compromised_project_blocked(self):
        proj = json.loads(self.contract.projects[self.proj_id])
        proj['status'] = 'COMPROMISED'
        self.contract.projects[self.proj_id] = json.dumps(proj)
        mock_gl.message.sender_address = "auditor_addr"
        mock_gl.message.value = int(0.1 * 10**18)
        audit_id = self.contract.audit_counter
        self.contract.audits[audit_id] = json.dumps({'project_id': str(self.proj_id), 'status': 'Pending', 'payout_status': 'Pending', 'analysis': '', 'submitter': 'auditor_addr', 'stake': str(int(0.1 * 10**18))})
        self.contract.audit_counter += 1
        self.contract.execute_audit(audit_id)
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(0.1 * 10**18))

    def test_audit_execution_oversized_response(self):
        mock_gl.message.sender_address = "auditor_addr"
        mock_gl.message.value = int(0.1 * 10**18)
        audit_id = self.contract.submit_audit(self.proj_id, "fake report", 1, 1)

        # Force strict_eq to actually call the inner function to test the byte cap
        original_strict_eq = mock_gl.eq_principle.strict_eq.return_value
        mock_gl.eq_principle.strict_eq.return_value = None
        mock_gl.eq_principle.strict_eq.side_effect = lambda f: f()
        
        class OversizedResponse:
            body = b"A" * (500 * 1024 + 1)
        mock_gl.nondet.web.get.return_value = OversizedResponse()

        res = self.contract.execute_audit(audit_id)
        self.assertTrue("Remote file exceeds maximum allowed size" in res)
        
        # Auditor stake must be refunded on error
        self.assertEqual(len(TestContractPaths.transfers), 1)
        self.assertEqual(TestContractPaths.transfers[0][0], "auditor_addr")
        self.assertEqual(TestContractPaths.transfers[0][1], int(0.1 * 10**18))
        
        # Restore mock state
        mock_gl.eq_principle.strict_eq.side_effect = None
        mock_gl.eq_principle.strict_eq.return_value = original_strict_eq

if __name__ == '__main__':
    unittest.main()
