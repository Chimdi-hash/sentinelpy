# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import urllib.parse
from genlayer import *

@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

class TrustlessWork(gl.Contract):
    owner: Address
    treasury: Address
    job_counter: u256
    submission_counter: u256
    worker_counter: u256
    
    jobs: TreeMap[u256, str]             # job_id -> JSON string
    job_balances: TreeMap[u256, u256]    # job_id -> current escrow in wei
    submissions: TreeMap[u256, str]     # submission_id -> JSON string
    
    workers: TreeMap[u256, str]          # index -> worker record JSON
    worker_indices: TreeMap[str, u256]   # worker address string -> index
    
    total_fees_collected_wei: u256
    total_slashed_captured_wei: u256
    total_jobs_completed: u256

    def __init__(self, treasury_address: str = ""):
        self.owner = Address(str(gl.message.sender_address))
        if treasury_address and treasury_address != "0x0000000000000000000000000000000000000000":
            self.treasury = Address(treasury_address)
        else:
            self.treasury = Address(str(gl.message.sender_address))
        self.job_counter = u256(0)
        self.submission_counter = u256(0)
        self.worker_counter = u256(0)
        self.total_fees_collected_wei = u256(0)
        self.total_slashed_captured_wei = u256(0)
        self.total_jobs_completed = u256(0)

    @gl.public.write
    def set_treasury(self, new_treasury: str) -> str:
        """Owner can update the treasury recipient address."""
        if str(gl.message.sender_address) != str(self.owner):
            raise Exception("Only the owner can update the treasury address")
        self.treasury = Address(new_treasury)
        return f"Treasury updated to {new_treasury}"

    def _record_worker_win(self, worker_addr: str, payout_wei: int):
        addr_str = str(worker_addr)
        if addr_str not in self.worker_indices:
            idx = self.worker_counter
            self.worker_indices[addr_str] = idx
            rec = {
                "address": addr_str,
                "total_earned_wei": payout_wei,
                "jobs_completed": 1,
                "slashed_count": 0
            }
            self.workers[idx] = json.dumps(rec)
            self.worker_counter += 1
        else:
            idx = self.worker_indices[addr_str]
            rec = json.loads(self.workers[idx])
            rec["total_earned_wei"] = rec.get("total_earned_wei", 0) + payout_wei
            rec["jobs_completed"] = rec.get("jobs_completed", 0) + 1
            self.workers[idx] = json.dumps(rec)

    def _record_worker_slash(self, worker_addr: str):
        addr_str = str(worker_addr)
        if addr_str not in self.worker_indices:
            idx = self.worker_counter
            self.worker_indices[addr_str] = idx
            rec = {
                "address": addr_str,
                "total_earned_wei": 0,
                "jobs_completed": 0,
                "slashed_count": 1
            }
            self.workers[idx] = json.dumps(rec)
            self.worker_counter += 1
        else:
            idx = self.worker_indices[addr_str]
            rec = json.loads(self.workers[idx])
            rec["slashed_count"] = rec.get("slashed_count", 0) + 1
            self.workers[idx] = json.dumps(rec)

    @gl.public.write.payable
    def post_job(self, title: str, description: str, rubric: str, min_stake_wei: int = int(0.1 * 10**18)) -> u256:
        """Client posts a gig with an escrow deposit, objective rubric, and required freelancer stake."""
        if gl.message.value <= 0:
            raise Exception("Must deposit funds into escrow for the job")
        if not title or not title.strip():
            raise Exception("Job title is required")
        if not rubric or not rubric.strip():
            raise Exception("Objective acceptance rubric is required for AI evaluation")
        if min_stake_wei < int(0.01 * 10**18):
            raise Exception("Minimum stake must be at least 0.01 GEN")

        job_id = self.job_counter
        self.jobs[job_id] = json.dumps({
            "id": str(job_id),
            "title": title.strip(),
            "description": description.strip() if description else "",
            "rubric": rubric.strip(),
            "client": str(gl.message.sender_address),
            "status": "OPEN",  # OPEN, IN_REVIEW, AWAITING_CLIENT_ACTION, COMPLETED, CANCELLED_REFUNDED
            "min_stake_wei": str(min_stake_wei),
            "pending_submissions": 0
        })
        self.job_balances[job_id] = u256(int(gl.message.value))
        self.job_counter += 1
        return job_id

    @gl.public.write.payable
    def submit_deliverable(self, job_id: u256, deliverable_url: str, notes: str) -> u256:
        """Freelancer stakes collateral and submits their deliverable URL (e.g. GitHub PR, website, live doc)."""
        if job_id not in self.jobs:
            raise Exception("Job not found")
            
        job = json.loads(self.jobs[job_id])
        if job.get("status") not in ["OPEN", "AWAITING_CLIENT_ACTION"]:
            raise Exception(f"Job is not open for submissions. Current status: {job.get('status')}")
            
        min_stake = int(job.get("min_stake_wei", int(0.1 * 10**18)))
        if gl.message.value < min_stake:
            raise Exception(f"Insufficient stake attached. Required: {min_stake} wei")
            
        if not deliverable_url or not deliverable_url.strip():
            raise Exception("Deliverable URL is required")
            
        url_clean = deliverable_url.strip()
        if not (url_clean.startswith("http://") or url_clean.startswith("https://")):
            raise Exception("Deliverable URL must start with http:// or https://")
            
        job["pending_submissions"] = job.get("pending_submissions", 0) + 1
        job["status"] = "IN_REVIEW"
        self.jobs[job_id] = json.dumps(job)
        
        submission_id = self.submission_counter
        self.submissions[submission_id] = json.dumps({
            "id": str(submission_id),
            "job_id": str(job_id),
            "worker": str(gl.message.sender_address),
            "stake_wei": str(gl.message.value),
            "deliverable_url": url_clean,
            "notes": notes.strip() if notes else "",
            "status": "Pending",  # Pending, APPROVED, REJECTED, Error
            "evaluation_trace": "",
            "payout_status": "Pending"
        })
        self.submission_counter += 1
        return submission_id

    @gl.public.write
    def evaluate_submission(self, submission_id: u256) -> str:
        """GenVM evaluates the deliverable against the client rubric, enforcing 2.5% fee and 100% slash capture."""
        if submission_id not in self.submissions:
            raise Exception("Submission not found")
            
        submission = json.loads(self.submissions[submission_id])
        if submission.get("status") != "Pending":
            raise Exception("Submission has already been evaluated")
            
        job_id = u256(int(submission["job_id"]))
        job = json.loads(self.jobs[job_id])
        
        # Decrement pending submissions count
        job["pending_submissions"] = max(0, job.get("pending_submissions", 0) - 1)
        self.jobs[job_id] = json.dumps(job)
        
        worker_addr = Address(submission["worker"])
        stake_wei = int(submission.get("stake_wei", int(0.1 * 10**18)))
        
        # If job was cancelled or completed while pending, refund stake
        if job.get("status") in ["COMPLETED", "CANCELLED_REFUNDED"]:
            submission["status"] = "Error"
            submission["evaluation_trace"] = f"Evaluation aborted: Job is {job.get('status')}"
            self.submissions[submission_id] = json.dumps(submission)
            _Recipient(worker_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return f"Job is {job.get('status')}"
            
        deliverable_url = submission["deliverable_url"]
        
        # 1. Fetch Deliverable directly from URL with strict 500KB cap
        def fetch_deliverable() -> str:
            response = gl.nondet.web.get(deliverable_url)
            MAX_BYTES = 500 * 1024  # 500 KB limit
            if len(response.body) > MAX_BYTES:
                raise Exception(f"Remote deliverable exceeds maximum allowed size of {MAX_BYTES} bytes.")
            return response.body.decode("utf-8")

        try:
            deliverable_content = gl.eq_principle.strict_eq(fetch_deliverable)
        except Exception as e:
            submission["status"] = "Error"
            submission["evaluation_trace"] = f"Fetch error for deliverable: {str(e)}"
            self.submissions[submission_id] = json.dumps(submission)
            
            # Reset job back to OPEN so it's not permanently locked
            job["status"] = "OPEN"
            self.jobs[job_id] = json.dumps(job)
            
            # Refund worker's stake on network/fetch error
            _Recipient(worker_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return str(e)

        # 2. Decentralized AI Consensus Evaluation
        def get_eval_context() -> str:
            return f"""
EVALUATION TARGET:
Job Title: {job.get('title', '')}
Job Description: {job.get('description', '')}

CLIENT'S ACCEPTANCE RUBRIC:
{job.get('rubric', '')}

FREELANCER'S SUBMITTED NOTES:
{submission.get('notes', 'None')}

DELIVERABLE CONTENT (Bounded to first 3000 chars):
{deliverable_content[:3000]}

OBJECTIVE EVALUATION DIRECTIVE:
You are an expert impartial quality assurance evaluator.
Compare the contractor's deliverable against the client's acceptance rubric.
Determine if the work substantively fulfills the requirements.

Return a JSON response with EXACTLY these keys:
- 'decision': 'APPROVED' (if criteria are met) or 'REJECTED' (if incomplete, broken, or substandard).
- 'quality_score': Integer from 0 to 100.
- 'missing_requirements': Short summary of unmet requirements (or 'None').
- 'reasoning': Impartial explanation justifying your verdict.
"""

        response = gl.eq_principle.prompt_non_comparative(
            get_eval_context,
            task="Evaluate contractor deliverable against client acceptance rubric.",
            criteria="Validators MUST verify that the deliverable satisfies the client's rubric requirements. Approve only if criteria are met. Reject if requirements are missing, incomplete, or broken."
        )

        clean_resp = response.strip()
        if clean_resp.startswith("```json"):
            clean_resp = clean_resp[7:]
        elif clean_resp.startswith("```"):
            clean_resp = clean_resp[3:]
        if clean_resp.endswith("```"):
            clean_resp = clean_resp[:-3]
        clean_resp = clean_resp.strip()

        try:
            result = json.loads(clean_resp)
            expected_keys = {"decision", "quality_score", "missing_requirements", "reasoning"}
            if set(result.keys()) != expected_keys:
                raise Exception(f"Schema mismatch in AI consensus. Expected: {expected_keys}")
            if result["decision"] not in ["APPROVED", "REJECTED"]:
                raise Exception(f"Invalid decision: {result['decision']}")
            score = int(result["quality_score"])
            if score < 0 or score > 100:
                raise Exception("Quality score must be between 0 and 100")
        except Exception as e:
            submission["status"] = "Error"
            submission["evaluation_trace"] = f"AI consensus parsing error: {str(e)}"
            self.submissions[submission_id] = json.dumps(submission)
            job["status"] = "OPEN"
            self.jobs[job_id] = json.dumps(job)
            _Recipient(worker_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return str(e)

        submission["status"] = result["decision"]
        formatted_trace = (
            f"Decision: {result.get('decision')}\n"
            f"Quality Score: {result.get('quality_score')}/100\n"
            f"Missing Requirements: {result.get('missing_requirements', 'None')}\n"
            f"Reasoning: {result.get('reasoning', '')}"
        )
        submission["evaluation_trace"] = formatted_trace

        # 3. Settlement & Revenue Engine
        current_escrow = int(self.job_balances.get(job_id, u256(0)))

        if result["decision"] == "APPROVED":
            # 2.5% Protocol Take-Rate (250 basis points)
            FEE_BPS = 250
            fee_wei = (current_escrow * FEE_BPS) // 10000
            worker_payout_wei = (current_escrow - fee_wei)

            # Transfer 2.5% fee to Owner Treasury
            if fee_wei > 0:
                _Recipient(self.treasury).emit_transfer(value=u256(fee_wei), on='finalized')
                self.total_fees_collected_wei = u256(int(self.total_fees_collected_wei) + fee_wei)

            # Transfer (97.5% Bounty + Stake) to Freelancer
            total_worker_transfer = worker_payout_wei + stake_wei
            _Recipient(worker_addr).emit_transfer(value=u256(total_worker_transfer), on='finalized')
            
            # Update state
            self.job_balances[job_id] = u256(0)
            job["status"] = "COMPLETED"
            self.jobs[job_id] = json.dumps(job)
            
            submission["payout_status"] = "BOUNTY_PAID"
            self.total_jobs_completed = u256(int(self.total_jobs_completed) + 1)
            self._record_worker_win(str(worker_addr), worker_payout_wei)

        else:
            # REJECTED: 100% of Slashed Stake is routed to YOUR Treasury (Pure Profit!)
            _Recipient(self.treasury).emit_transfer(value=u256(stake_wei), on='finalized')
            self.total_slashed_captured_wei = u256(int(self.total_slashed_captured_wei) + stake_wei)

            # Client escrow is 100% PRESERVED in the smart contract!
            # Job transitions to AWAITING_CLIENT_ACTION (Option B)
            job["status"] = "AWAITING_CLIENT_ACTION"
            self.jobs[job_id] = json.dumps(job)

            submission["payout_status"] = "STAKE_SLASHED_TO_TREASURY"
            self._record_worker_slash(str(worker_addr))

        self.submissions[submission_id] = json.dumps(submission)
        return json.dumps(result)

    @gl.public.write
    def relist_job(self, job_id: u256, updated_rubric: str) -> str:
        """Client re-opens the gig for other freelancers to attempt after a rejection, optionally updating criteria."""
        if job_id not in self.jobs:
            raise Exception("Job not found")
        job = json.loads(self.jobs[job_id])
        if str(gl.message.sender_address) != job["client"]:
            raise Exception("Only the client can re-list this gig")
        if job.get("status") not in ["AWAITING_CLIENT_ACTION", "OPEN"]:
            raise Exception(f"Cannot re-list. Current status: {job.get('status')}")
        if int(self.job_balances.get(job_id, u256(0))) <= 0:
            raise Exception("Cannot re-list a job with 0 escrow balance")
        if job.get("pending_submissions", 0) > 0:
            raise Exception("Cannot re-list while a submission is in review")
            
        if updated_rubric and updated_rubric.strip():
            job["rubric"] = updated_rubric.strip()
        job["status"] = "OPEN"
        self.jobs[job_id] = json.dumps(job)
        return "Job successfully re-listed for new freelancers"

    @gl.public.write
    def withdraw_escrow(self, job_id: u256) -> str:
        """Client pulls 100% of their deposited escrow back to their wallet natively, permanently closing the gig."""
        if job_id not in self.jobs:
            raise Exception("Job not found")
        job = json.loads(self.jobs[job_id])
        if str(gl.message.sender_address) != job["client"]:
            raise Exception("Only the client can withdraw escrow")
        if job.get("status") in ["COMPLETED", "CANCELLED_REFUNDED"]:
            raise Exception("Escrow has already been settled or refunded")
        if job.get("pending_submissions", 0) > 0:
            raise Exception("Cannot withdraw escrow while an evaluation is pending")
            
        current_pool = int(self.job_balances.get(job_id, u256(0)))
        if current_pool <= 0:
            raise Exception("No funds in escrow to withdraw")
            
        job["status"] = "CANCELLED_REFUNDED"
        self.jobs[job_id] = json.dumps(job)
        self.job_balances[job_id] = u256(0)
        
        _Recipient(Address(job["client"])).emit_transfer(value=u256(current_pool), on='finalized')
        return "Full escrow refunded to client wallet"

    # --- View Methods ---

    @gl.public.view
    def get_job(self, job_id: u256) -> str:
        if job_id not in self.jobs:
            raise Exception("Job not found")
        job = json.loads(self.jobs[job_id])
        job["escrow_balance"] = str(self.job_balances.get(job_id, u256(0)))
        return json.dumps(job)

    @gl.public.view
    def get_all_jobs(self) -> str:
        all_j = []
        for i in range(int(self.job_counter)):
            jid = u256(i)
            if jid in self.jobs:
                job = json.loads(self.jobs[jid])
                job["escrow_balance"] = str(self.job_balances.get(jid, u256(0)))
                all_j.append(job)
        return json.dumps(all_j)

    @gl.public.view
    def get_submission(self, submission_id: u256) -> str:
        if submission_id not in self.submissions:
            raise Exception("Submission not found")
        return self.submissions[submission_id]

    @gl.public.view
    def get_all_submissions(self) -> str:
        all_s = []
        for i in range(int(self.submission_counter)):
            sid = u256(i)
            if sid in self.submissions:
                all_s.append(json.loads(self.submissions[sid]))
        return json.dumps(all_s)

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "owner": str(self.owner),
            "treasury": str(self.treasury),
            "total_fees_collected_wei": str(self.total_fees_collected_wei),
            "total_slashed_captured_wei": str(self.total_slashed_captured_wei),
            "total_jobs_completed": int(self.total_jobs_completed),
            "total_jobs_created": int(self.job_counter),
            "total_submissions": int(self.submission_counter)
        })

    @gl.public.view
    def get_worker_leaderboard(self) -> str:
        all_w = []
        for i in range(int(self.worker_counter)):
            wid = u256(i)
            if wid in self.workers:
                all_w.append(json.loads(self.workers[wid]))
        all_w.sort(key=lambda x: x.get("total_earned_wei", 0), reverse=True)
        return json.dumps(all_w)

    @gl.public.view
    def get_worker(self, addr: str) -> str:
        addr_str = str(addr)
        if addr_str not in self.worker_indices:
            return json.dumps({
                "address": addr_str,
                "total_earned_wei": 0,
                "jobs_completed": 0,
                "slashed_count": 0
            })
        idx = self.worker_indices[addr_str]
        return self.workers[idx]