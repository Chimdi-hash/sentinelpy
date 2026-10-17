import unittest
import json
from unittest.mock import MagicMock, patch
import sys
import os

# 1. Mock GenLayer dependencies before importing contract
mock_gl = MagicMock()
sys.modules['genlayer'] = mock_gl

class FakeAddress(str):
    def __init__(self, val):
        self.val = str(val)
    def __str__(self):
        return self.val
    def __repr__(self):
        return f"Address('{self.val}')"
    def __eq__(self, other):
        return str(self) == str(other)

def fake_u256(val):
    return int(val)

class FakeTreeMap(dict):
    def __class_getitem__(cls, item):
        return cls

mock_gl.Address = FakeAddress
mock_gl.u256 = fake_u256
mock_gl.TreeMap = FakeTreeMap
mock_gl.gl = mock_gl
mock_gl.Contract = object

# Decorator stubs
mock_gl.evm.contract_interface = lambda cls: cls
mock_gl.public.write = lambda f: f
mock_gl.public.write.payable = lambda f: f
mock_gl.public.view = lambda f: f

# Set default sender
mock_gl.message.sender_address = "0xDEPLOYER_OWNER"
mock_gl.message.value = 0

# Track outgoing native transfers
class DummyRecipient:
    def __init__(self, addr):
        self.addr = str(addr)
    def emit_transfer(self, value, on='finalized'):
        TestTrustlessWork.transfers.append({
            "to": self.addr,
            "value_wei": int(value),
            "on": on
        })

# Import contract
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import contracts.trustlesswork as tw_module
from contracts.trustlesswork import TrustlessWork

# Patch _Recipient in the module
tw_module._Recipient = DummyRecipient


class TestTrustlessWork(unittest.TestCase):
    transfers = []
    TREASURY = "0x740ad14AbB7991d45bA4dEc88B59eF12aF33DbbB"
    CLIENT = "0xCLIENT_ALICE"
    WORKER = "0xWORKER_BOB"
    OWNER = "0xDEPLOYER_OWNER"

    def setUp(self):
        TestTrustlessWork.transfers = []
        mock_gl.message.sender_address = self.OWNER
        mock_gl.message.value = 0
        
        self.contract = TrustlessWork(treasury_address=self.TREASURY)
        self.contract.jobs = FakeTreeMap()
        self.contract.job_balances = FakeTreeMap()
        self.contract.submissions = FakeTreeMap()
        self.contract.workers = FakeTreeMap()
        self.contract.worker_indices = FakeTreeMap()

        # Mock nondet web fetch and consensus prompt by default
        self.mock_web_response = MagicMock()
        self.mock_web_response.body = b"<html>Test deliverable content: clean code and documentation.</html>"
        
        mock_gl.nondet.web.get.return_value = self.mock_web_response
        mock_gl.eq_principle.strict_eq.side_effect = lambda fn: fn()

    # --- Initialization Tests ---

    def test_initialization(self):
        """Verify contract initializes with correct owner, treasury, and zero counters."""
        self.assertEqual(str(self.contract.owner), self.OWNER)
        self.assertEqual(str(self.contract.treasury), self.TREASURY)
        self.assertEqual(int(self.contract.job_counter), 0)
        self.assertEqual(int(self.contract.submission_counter), 0)
        self.assertEqual(int(self.contract.total_fees_collected_wei), 0)
        self.assertEqual(int(self.contract.total_slashed_captured_wei), 0)
        self.assertEqual(int(self.contract.total_jobs_completed), 0)

    def test_set_treasury_by_owner_and_unauthorized(self):
        """Owner can update treasury, non-owner cannot."""
        # Non-owner attempt
        mock_gl.message.sender_address = self.CLIENT
        with self.assertRaises(Exception) as ctx:
            self.contract.set_treasury("0xNEW_TREASURY")
        self.assertIn("Only the owner can update the treasury address", str(ctx.exception))

        # Owner attempt
        mock_gl.message.sender_address = self.OWNER
        res = self.contract.set_treasury("0xNEW_TREASURY")
        self.assertIn("Treasury updated to 0xNEW_TREASURY", res)
        self.assertEqual(str(self.contract.treasury), "0xNEW_TREASURY")

    # --- Job Posting Tests ---

    def test_post_job_success(self):
        """Client posts a job with valid escrow, title, rubric, and min stake."""
        mock_gl.message.sender_address = self.CLIENT
        escrow_wei = int(2.0 * 10**18)  # 2 GEN
        mock_gl.message.value = escrow_wei

        job_id = self.contract.post_job(
            title="Build Web3 Landing Page",
            description="Need modern responsive React landing page",
            rubric="1. Mobile responsive. 2. Web3 wallet connect works. 3. Clean styling.",
            min_stake_wei=int(0.2 * 10**18)
        )

        self.assertEqual(int(job_id), 0)
        self.assertEqual(int(self.contract.job_counter), 1)
        self.assertEqual(self.contract.job_balances[job_id], escrow_wei)

        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["title"], "Build Web3 Landing Page")
        self.assertEqual(job_data["client"], self.CLIENT)
        self.assertEqual(job_data["status"], "OPEN")
        self.assertEqual(job_data["pending_submissions"], 0)
        self.assertEqual(int(job_data["min_stake_wei"]), int(0.2 * 10**18))

    def test_post_job_validations(self):
        """post_job must enforce positive escrow, non-empty title/rubric, and min stake >= 0.01 GEN."""
        mock_gl.message.sender_address = self.CLIENT
        mock_gl.message.value = 0

        # Zero deposit
        with self.assertRaises(Exception) as ctx:
            self.contract.post_job("Title", "Desc", "Rubric")
        self.assertIn("Must deposit funds into escrow", str(ctx.exception))

        # Empty title
        mock_gl.message.value = int(1.0 * 10**18)
        with self.assertRaises(Exception) as ctx:
            self.contract.post_job("   ", "Desc", "Rubric")
        self.assertIn("Job title is required", str(ctx.exception))

        # Empty rubric
        with self.assertRaises(Exception) as ctx:
            self.contract.post_job("Title", "Desc", "   ")
        self.assertIn("Objective acceptance rubric is required", str(ctx.exception))

        # Too low stake
        with self.assertRaises(Exception) as ctx:
            self.contract.post_job("Title", "Desc", "Rubric", min_stake_wei=int(0.001 * 10**18))
        self.assertIn("Minimum stake must be at least 0.01 GEN", str(ctx.exception))

    # --- Deliverable Submission Tests ---

    def _create_standard_job(self):
        mock_gl.message.sender_address = self.CLIENT
        mock_gl.message.value = int(4.0 * 10**18)  # 4 GEN escrow
        return self.contract.post_job(
            title="Design DeFi Dashboard",
            description="Figma and HTML/CSS mockups",
            rubric="Must include dark mode and token swap table",
            min_stake_wei=int(0.2 * 10**18)
        )

    def test_submit_deliverable_success(self):
        """Worker stakes collateral and submits a valid URL."""
        job_id = self._create_standard_job()

        mock_gl.message.sender_address = self.WORKER
        stake_wei = int(0.25 * 10**18)
        mock_gl.message.value = stake_wei

        sub_id = self.contract.submit_deliverable(
            job_id=job_id,
            deliverable_url="https://github.com/workerbob/defi-dash/pull/1",
            notes="Implemented dark mode and swap table with Tailwind"
        )

        self.assertEqual(int(sub_id), 0)
        self.assertEqual(int(self.contract.submission_counter), 1)

        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "IN_REVIEW")
        self.assertEqual(job_data["pending_submissions"], 1)

        sub_data = json.loads(self.contract.submissions[sub_id])
        self.assertEqual(sub_data["worker"], self.WORKER)
        self.assertEqual(int(sub_data["stake_wei"]), stake_wei)
        self.assertEqual(sub_data["status"], "Pending")

    def test_submit_deliverable_insufficient_stake_and_invalid_url(self):
        """Rejects submission if stake is insufficient or URL is invalid."""
        job_id = self._create_standard_job()

        mock_gl.message.sender_address = self.WORKER
        # Insufficient stake (required 0.2 GEN, sending 0.1 GEN)
        mock_gl.message.value = int(0.1 * 10**18)
        with self.assertRaises(Exception) as ctx:
            self.contract.submit_deliverable(job_id, "https://github.com/pr", "notes")
        self.assertIn("Insufficient stake attached", str(ctx.exception))

        # Invalid URL scheme
        mock_gl.message.value = int(0.2 * 10**18)
        with self.assertRaises(Exception) as ctx:
            self.contract.submit_deliverable(job_id, "ftp://example.com/pr", "notes")
        self.assertIn("Deliverable URL must start with http:// or https://", str(ctx.exception))

    # --- Evaluation: APPROVED Path (2.5% Fee to Treasury) ---

    def test_evaluate_submission_approved_path(self):
        """APPROVED path: 2.5% take-rate routed to Treasury, 97.5% + stake to Worker."""
        job_id = self._create_standard_job()  # 4 GEN escrow
        escrow_wei = int(4.0 * 10**18)
        stake_wei = int(0.5 * 10**18)

        mock_gl.message.sender_address = self.WORKER
        mock_gl.message.value = stake_wei
        sub_id = self.contract.submit_deliverable(job_id, "https://github.com/pr/1", "Deliverable ready")

        # Mock AI evaluation consensus returning APPROVED
        ai_response = json.dumps({
            "decision": "APPROVED",
            "quality_score": 98,
            "missing_requirements": "None",
            "reasoning": "All rubric requirements satisfied completely and bug-free."
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = f"```json\n{ai_response}\n```"

        TestTrustlessWork.transfers.clear()
        eval_result = self.contract.evaluate_submission(sub_id)

        # Expected calculations:
        # fee = (4.0 * 10^18 * 250) // 10000 = 0.1 * 10^18 (2.5%)
        expected_fee = (escrow_wei * 250) // 10000
        expected_payout = escrow_wei - expected_fee
        expected_worker_transfer = expected_payout + stake_wei

        self.assertEqual(expected_fee, 100000000000000000)  # 0.1 GEN
        self.assertEqual(expected_payout, 3900000000000000000)  # 3.9 GEN
        self.assertEqual(expected_worker_transfer, 4400000000000000000)  # 4.4 GEN

        # Verify outgoing transfers
        self.assertEqual(len(TestTrustlessWork.transfers), 2)
        # Transfer 1: 2.5% fee to Owner Treasury
        self.assertEqual(TestTrustlessWork.transfers[0]["to"], self.TREASURY)
        self.assertEqual(TestTrustlessWork.transfers[0]["value_wei"], expected_fee)

        # Transfer 2: 97.5% Bounty + 100% Staked Collateral to Worker
        self.assertEqual(TestTrustlessWork.transfers[1]["to"], self.WORKER)
        self.assertEqual(TestTrustlessWork.transfers[1]["value_wei"], expected_worker_transfer)

        # Verify contract revenue tracking & balances
        self.assertEqual(int(self.contract.total_fees_collected_wei), expected_fee)
        self.assertEqual(int(self.contract.total_jobs_completed), 1)
        self.assertEqual(self.contract.job_balances[job_id], 0)

        # Verify job and submission status
        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "COMPLETED")
        self.assertEqual(job_data["pending_submissions"], 0)

        sub_data = json.loads(self.contract.submissions[sub_id])
        self.assertEqual(sub_data["status"], "APPROVED")
        self.assertEqual(sub_data["payout_status"], "BOUNTY_PAID")

        # Verify worker leaderboard record
        worker_rec = json.loads(self.contract.get_worker(self.WORKER))
        self.assertEqual(worker_rec["total_earned_wei"], expected_payout)
        self.assertEqual(worker_rec["jobs_completed"], 1)
        self.assertEqual(worker_rec["slashed_count"], 0)

    # --- Evaluation: REJECTED Path (100% Stake Slashed to Treasury, Escrow Preserved) ---

    def test_evaluate_submission_rejected_path(self):
        """REJECTED path: 100% of Freelancer's stake is sent to Owner Treasury. Escrow is preserved in pool."""
        job_id = self._create_standard_job()  # 4 GEN escrow
        escrow_wei = int(4.0 * 10**18)
        stake_wei = int(0.3 * 10**18)  # 0.3 GEN stake

        mock_gl.message.sender_address = self.WORKER
        mock_gl.message.value = stake_wei
        sub_id = self.contract.submit_deliverable(job_id, "https://github.com/pr/fail", "Partial code")

        # Mock AI evaluation consensus returning REJECTED
        ai_response = json.dumps({
            "decision": "REJECTED",
            "quality_score": 25,
            "missing_requirements": "Dark mode missing, token swap button crashes app",
            "reasoning": "Underdelivered on critical client rubric acceptance criteria."
        })
        mock_gl.eq_principle.prompt_non_comparative.return_value = ai_response

        TestTrustlessWork.transfers.clear()
        eval_result = self.contract.evaluate_submission(sub_id)

        # Verify transfers: Exactly 1 transfer of 100% of the slashed stake to TREASURY
        self.assertEqual(len(TestTrustlessWork.transfers), 1)
        self.assertEqual(TestTrustlessWork.transfers[0]["to"], self.TREASURY)
        self.assertEqual(TestTrustlessWork.transfers[0]["value_wei"], stake_wei)

        # Verify protocol slashing revenue counter incremented
        self.assertEqual(int(self.contract.total_slashed_captured_wei), stake_wei)
        self.assertEqual(int(self.contract.total_fees_collected_wei), 0)

        # CRITICAL OPTION B VERIFICATION:
        # Client escrow is 100% PRESERVED in the smart contract pool!
        self.assertEqual(self.contract.job_balances[job_id], escrow_wei)

        # Job transitions to AWAITING_CLIENT_ACTION
        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "AWAITING_CLIENT_ACTION")
        self.assertEqual(job_data["pending_submissions"], 0)

        # Submission status
        sub_data = json.loads(self.contract.submissions[sub_id])
        self.assertEqual(sub_data["status"], "REJECTED")
        self.assertEqual(sub_data["payout_status"], "STAKE_SLASHED_TO_TREASURY")

        # Worker leaderboard tracks slash count
        worker_rec = json.loads(self.contract.get_worker(self.WORKER))
        self.assertEqual(worker_rec["slashed_count"], 1)
        self.assertEqual(worker_rec["total_earned_wei"], 0)

    # --- Option B Lifecycle: Re-list Gig & Multiplier Revenue ---

    def test_relist_job_and_compounding_revenue(self):
        """Client re-lists after rejection, second worker submits and also gets rejected -> 2 stakes captured!"""
        job_id = self._create_standard_job()
        stake_1 = int(0.2 * 10**18)
        stake_2 = int(0.4 * 10**18)

        # Worker 1 submits and is rejected
        mock_gl.message.sender_address = "0xWORKER_1"
        mock_gl.message.value = stake_1
        sub_1 = self.contract.submit_deliverable(job_id, "https://work1.com", "Attempt 1")

        mock_gl.eq_principle.prompt_non_comparative.return_value = json.dumps({
            "decision": "REJECTED", "quality_score": 10, "missing_requirements": "All", "reasoning": "Incomplete"
        })
        self.contract.evaluate_submission(sub_1)

        # First stake sent to treasury
        self.assertEqual(int(self.contract.total_slashed_captured_wei), stake_1)

        # Non-client cannot relist
        mock_gl.message.sender_address = "0xATTACKER"
        with self.assertRaises(Exception) as ctx:
            self.contract.relist_job(job_id, "Updated rubric")
        self.assertIn("Only the client can re-list this gig", str(ctx.exception))

        # Client re-lists with updated rubric
        mock_gl.message.sender_address = self.CLIENT
        relist_res = self.contract.relist_job(job_id, updated_rubric="New strict rubric v2")
        self.assertIn("Job successfully re-listed", relist_res)

        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "OPEN")
        self.assertEqual(job_data["rubric"], "New strict rubric v2")

        # Worker 2 submits on re-listed gig with stake_2
        mock_gl.message.sender_address = "0xWORKER_2"
        mock_gl.message.value = stake_2
        sub_2 = self.contract.submit_deliverable(job_id, "https://work2.com", "Attempt 2")

        # Worker 2 is also rejected
        self.contract.evaluate_submission(sub_2)

        # Both stakes successfully captured by treasury!
        self.assertEqual(int(self.contract.total_slashed_captured_wei), stake_1 + stake_2)
        self.assertEqual(self.contract.job_balances[job_id], int(4.0 * 10**18))

    # --- Option B Lifecycle: Client Escrow Withdrawal ---

    def test_withdraw_escrow_success(self):
        """Client can withdraw 100% of remaining escrow if they decide not to re-list."""
        job_id = self._create_standard_job()
        escrow_wei = int(4.0 * 10**18)

        # Non-client cannot withdraw
        mock_gl.message.sender_address = self.WORKER
        with self.assertRaises(Exception) as ctx:
            self.contract.withdraw_escrow(job_id)
        self.assertIn("Only the client can withdraw escrow", str(ctx.exception))

        # Client withdraws
        TestTrustlessWork.transfers.clear()
        mock_gl.message.sender_address = self.CLIENT
        res = self.contract.withdraw_escrow(job_id)
        self.assertIn("Full escrow refunded to client wallet", res)

        # Escrow transfer made to client
        self.assertEqual(len(TestTrustlessWork.transfers), 1)
        self.assertEqual(TestTrustlessWork.transfers[0]["to"], self.CLIENT)
        self.assertEqual(TestTrustlessWork.transfers[0]["value_wei"], escrow_wei)

        # State updated
        self.assertEqual(self.contract.job_balances[job_id], 0)
        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "CANCELLED_REFUNDED")

        # Cannot withdraw again
        with self.assertRaises(Exception) as ctx:
            self.contract.withdraw_escrow(job_id)
        self.assertIn("Escrow has already been settled or refunded", str(ctx.exception))

    def test_cannot_withdraw_while_submission_pending(self):
        """Client cannot rug a freelancer while their submission is pending evaluation."""
        job_id = self._create_standard_job()
        mock_gl.message.sender_address = self.WORKER
        mock_gl.message.value = int(0.2 * 10**18)
        self.contract.submit_deliverable(job_id, "https://deliverable.com", "Notes")

        mock_gl.message.sender_address = self.CLIENT
        with self.assertRaises(Exception) as ctx:
            self.contract.withdraw_escrow(job_id)
        self.assertIn("Cannot withdraw escrow while an evaluation is pending", str(ctx.exception))

    # --- Safety & Edge Case Tests ---

    def test_deliverable_size_cap_500kb_exceeded(self):
        """If remote deliverable exceeds 500 KB, fetch fails safely and worker's stake is refunded."""
        job_id = self._create_standard_job()
        stake_wei = int(0.3 * 10**18)

        mock_gl.message.sender_address = self.WORKER
        mock_gl.message.value = stake_wei
        sub_id = self.contract.submit_deliverable(job_id, "https://huge-file.com", "Big file")

        # Mock payload exceeding 500 KB (500 * 1024 + 1 bytes)
        huge_bytes = b"X" * (500 * 1024 + 10)
        self.mock_web_response.body = huge_bytes

        TestTrustlessWork.transfers.clear()
        eval_res = self.contract.evaluate_submission(sub_id)

        # Error recorded
        sub_data = json.loads(self.contract.submissions[sub_id])
        self.assertEqual(sub_data["status"], "Error")
        self.assertIn("exceeds maximum allowed size", sub_data["evaluation_trace"])

        # Worker stake refunded
        self.assertEqual(len(TestTrustlessWork.transfers), 1)
        self.assertEqual(TestTrustlessWork.transfers[0]["to"], self.WORKER)
        self.assertEqual(TestTrustlessWork.transfers[0]["value_wei"], stake_wei)

        # Job reset to OPEN
        job_data = json.loads(self.contract.jobs[job_id])
        self.assertEqual(job_data["status"], "OPEN")

    def test_ai_consensus_malformed_json_handling(self):
        """If LLM consensus outputs invalid JSON, error is caught, worker stake refunded, job reopened."""
        job_id = self._create_standard_job()
        stake_wei = int(0.2 * 10**18)

        mock_gl.message.sender_address = self.WORKER
        mock_gl.message.value = stake_wei
        sub_id = self.contract.submit_deliverable(job_id, "https://valid.com", "Notes")

        # Malformed LLM output
        mock_gl.eq_principle.prompt_non_comparative.return_value = "I think it is good! (not JSON)"

        TestTrustlessWork.transfers.clear()
        self.contract.evaluate_submission(sub_id)

        sub_data = json.loads(self.contract.submissions[sub_id])
        self.assertEqual(sub_data["status"], "Error")
        self.assertIn("AI consensus parsing error", sub_data["evaluation_trace"])

        # Stake safely refunded
        self.assertEqual(len(TestTrustlessWork.transfers), 1)
        self.assertEqual(TestTrustlessWork.transfers[0]["to"], self.WORKER)
        self.assertEqual(TestTrustlessWork.transfers[0]["value_wei"], stake_wei)

    # --- View Methods Tests ---

    def test_views_and_protocol_stats(self):
        """Test get_job, get_all_jobs, get_submission, get_all_submissions, and get_protocol_stats."""
        job_id = self._create_standard_job()

        # get_job
        job = json.loads(self.contract.get_job(job_id))
        self.assertEqual(job["id"], str(job_id))
        self.assertEqual(job["escrow_balance"], str(int(4.0 * 10**18)))

        # get_all_jobs
        all_jobs = json.loads(self.contract.get_all_jobs())
        self.assertEqual(len(all_jobs), 1)

        # stats
        stats = json.loads(self.contract.get_protocol_stats())
        self.assertEqual(stats["treasury"], self.TREASURY)
        self.assertEqual(stats["total_jobs_created"], 1)


if __name__ == '__main__':
    unittest.main()
