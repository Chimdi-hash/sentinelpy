# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import urllib.parse
import hashlib
from genlayer import *

@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

class Sentinelpy(gl.Contract):
    audit_counter: u256
    project_counter: u256
    audits: TreeMap[u256, str]
    projects: TreeMap[u256, str]
    project_balances: TreeMap[u256, u256]

    def __init__(self):
        self.audit_counter = u256(0)
        self.project_counter = u256(0)

    @gl.public.write.payable
    def register_project(self, target_url: str, content_hash: str) -> u256:
        """Sponsor registers a project, deposits a bounty pool, and pins the content hash."""
        try:
            parsed = urllib.parse.urlparse(target_url)
            if parsed.scheme not in ['http', 'https']:
                raise Exception("Invalid URL scheme. Must be http or https.")
        except Exception as e:
            raise Exception(f"Invalid Target URL format: {str(e)}")

        project_id = self.project_counter
        self.projects[project_id] = json.dumps({
            "target_url": target_url,
            "content_hash": content_hash,
            "sponsor": str(gl.message.sender_address),
            "status": "ACTIVE"
        })
        # Store the deposited GEN directly into the project's pool
        self.project_balances[project_id] = u256(int(gl.message.value))
        self.project_counter += 1
        return project_id

    @gl.public.write.payable
    def submit_audit(self, project_id: u256) -> u256:
        """Auditor submits an audit request against a project, staking 0.1 GEN."""
        required_wei = int(0.1 * 10**18)
        if gl.message.value < required_wei:
            raise Exception("Insufficient GEN attached to submit an audit (0.1 GEN required stake)")

        if project_id not in self.projects:
            raise Exception("Project not found")
        project = json.loads(self.projects[project_id])
        if project.get("status") == "COMPROMISED":
            raise Exception("Duplicate claim protection: Project is already proven vulnerable and settled.")

        audit_id = self.audit_counter
        self.audits[audit_id] = json.dumps({
            "project_id": str(project_id),
            "status": "Pending",
            "payout_status": "Pending",
            "analysis": "",
            "submitter": str(gl.message.sender_address),
            "stake": str(gl.message.value)
        })
        self.audit_counter += 1
        return audit_id

    @gl.public.write
    def close_project(self, project_id: u256) -> str:
        """Sponsor withdraws funds and closes the project (unused-pool case)."""
        if project_id not in self.projects:
            raise Exception("Project not found")
            
        project = json.loads(self.projects[project_id])
        if str(gl.message.sender_address) != project["sponsor"]:
            raise Exception("Only the sponsor can close the project")
            
        if project.get("status") in ["CLOSED", "COMPROMISED"]:
            raise Exception("Project is already closed or compromised")
            
        current_pool = int(self.project_balances.get(project_id, u256(0)))
        
        # Mark as closed
        project["status"] = "CLOSED"
        self.projects[project_id] = json.dumps(project)
        self.project_balances[project_id] = u256(0)
        
        # Refund unused pool
        if current_pool > 0:
            _Recipient(Address(project["sponsor"])).emit_transfer(value=u256(current_pool), on='finalized')
            
        return "Project closed and funds withdrawn"

    @gl.public.write
    def execute_audit(self, audit_id: u256) -> str:
        """GenVM executes the audit, fetches source code, and determines payout."""
        if audit_id not in self.audits:
            raise Exception("Audit not found")
        
        audit = json.loads(self.audits[audit_id])
        if audit["status"] != "Pending":
            raise Exception("Audit has already been executed")
            
        project_id = u256(int(audit["project_id"]))
        project = json.loads(self.projects[project_id])
        target_url = project["target_url"]
        
        # 1. Fetch Source Code directly from URL to prevent user manipulation
        def fetch_source() -> str:
            response = gl.nondet.web.get(target_url)
            return response.body.decode("utf-8")

        try:
            source_code = gl.eq_principle.strict_eq(fetch_source)
            # Verify the content hash matches the registered artifact
            fetched_hash = hashlib.sha256(source_code.encode("utf-8")).hexdigest()
            if fetched_hash != project.get("content_hash", ""):
                raise Exception(f"Content hash mismatch! Expected {project.get('content_hash')} but got {fetched_hash}. The audited URL has changed.")
            # Do NOT truncate source_code; full evaluation is required
        except Exception as e:
            audit["status"] = "Error"
            audit["analysis"] = f"Fetch/Hash error for {target_url}: {str(e)}"
            self.audits[audit_id] = json.dumps(audit)
            
            # Refund auditor's stake on error to prevent locked funds
            submitter_addr = Address(audit["submitter"])
            stake_wei = int(audit.get("stake", int(0.1 * 10**18)))
            _Recipient(submitter_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return str(e)
        
        # 2. Strong Consensus: Require substantive evidence
        def get_audit_context() -> str:
            return f"""
EVALUATION TARGET:
Target URL: {target_url}
Source Code (Fetched Directly by Contract):
{source_code}

CRITICAL SECURITY DIRECTIVE:
Identify any critical vulnerabilities (like Reentrancy, Logic Flaws, Prompt Injection) in this source code. 
Return a JSON response with EXACTLY these keys:
- 'decision': 'SECURE' or 'MALICIOUS'
- 'vulnerability_type': Short name of the vulnerability (e.g. 'Reentrancy', 'None')
- 'evidence_line_snippet': The exact line of code that causes the issue (or 'None')
- 'reasoning': Explanation.
"""
            
        response = gl.eq_principle.prompt_non_comparative(
            get_audit_context,
            task="Act as an expert blockchain security auditor. Evaluate the fetched source code.",
            criteria="Validators MUST verify that the extracted 'evidence_line_snippet' actually exists verbatim in the provided immutable source code artifact. Validators MUST verify the 'reasoning' logically proves a vulnerability. The 'decision' must be identically SECURE or MALICIOUS across validators. Reject if the snippet is fabricated or the logic is flawed."
        )
        
        # Parse JSON
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        elif clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        try:
            result = json.loads(clean_response)
            
            # 1. Strict schema validation
            expected_keys = {"decision", "vulnerability_type", "evidence_line_snippet", "reasoning"}
            if set(result.keys()) != expected_keys:
                raise Exception(f"Exact schema mismatch in AI response. Expected exactly: {expected_keys}")
            if result["decision"] not in ["SECURE", "MALICIOUS"]:
                raise Exception(f"Invalid decision: {result['decision']}")
            
            # 2. Verify cited evidence before settlement
            if result["decision"] == "MALICIOUS":
                snippet = result.get("evidence_line_snippet", "")
                if snippet == "None" or not snippet.strip():
                    raise Exception("MALICIOUS result must provide a valid evidence_line_snippet.")
                if snippet not in source_code:
                    raise Exception("Fabricated evidence: The cited line snippet was not found in the source code.")

        except Exception as e:
            audit["status"] = "Error"
            audit["analysis"] = f"AI Error/Invalid Schema/Fabrication: {str(e)}"
            self.audits[audit_id] = json.dumps(audit)
            
            # Refund auditor's full stake on error to prevent locked funds
            submitter_addr = Address(audit["submitter"])
            stake_wei = int(audit.get("stake", int(0.1 * 10**18)))
            _Recipient(submitter_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return str(e)
            
        audit["status"] = result["decision"]
        
        # Format the analysis to display the substantive evidence nicely
        formatted_analysis = (
            f"Vulnerability: {result.get('vulnerability_type', 'None')}\n"
            f"Evidence Snippet: {result.get('evidence_line_snippet', 'None')}\n"
            f"Reasoning: {result.get('reasoning', '')}"
        )
        audit["analysis"] = formatted_analysis
        
        # 3. Solvent Payout Logic
        submitter_addr = Address(audit["submitter"])
        stake_wei = int(audit.get("stake", int(0.1 * 10**18)))
        
        if audit["status"] == "MALICIOUS":
            bounty_wei = int(1.0 * 10**18)
            current_pool = int(self.project_balances.get(project_id, u256(0)))
            
            # Mark project as compromised to prevent future audits
            project["status"] = "COMPROMISED"
            self.projects[project_id] = json.dumps(project)
            
            if current_pool >= bounty_wei:
                # Pool is solvent.
                # Payout Stake + Bounty to Auditor
                _Recipient(submitter_addr).emit_transfer(value=u256(bounty_wei + stake_wei), on='finalized')
                audit["payout_status"] = "BOUNTY_PAID"
                
                # Full escrow settlement: Refund remaining pool to sponsor
                remaining_pool = current_pool - bounty_wei
                if remaining_pool > 0:
                    sponsor_addr = Address(project["sponsor"])
                    _Recipient(sponsor_addr).emit_transfer(value=u256(remaining_pool), on='finalized')
                self.project_balances[project_id] = u256(0)
            else:
                # Pool underfunded. Settle full remaining balance to auditor + refund stake.
                audit["payout_status"] = "POOL_DEPLETED_PARTIAL_PAYOUT"
                payout_amount = current_pool + stake_wei
                _Recipient(submitter_addr).emit_transfer(value=u256(payout_amount), on='finalized')
                self.project_balances[project_id] = u256(0)
        else:
            # Code is SECURE. False alarm by auditor.
            audit["payout_status"] = "STAKE_SLASHED"
            # Explicitly burn the 0.1 GEN stake by sending it to the null address
            _Recipient(Address("0x0000000000000000000000000000000000000000")).emit_transfer(value=u256(stake_wei), on='finalized')
        
        self.audits[audit_id] = json.dumps(audit)
        return json.dumps(result)

    @gl.public.view
    def get_audit(self, audit_id: u256) -> str:
        if audit_id not in self.audits:
            raise Exception("Audit not found")
        # Enhance audit with target_url for frontend convenience
        audit = json.loads(self.audits[audit_id])
        project_id = u256(int(audit["project_id"]))
        project = json.loads(self.projects[project_id])
        audit["target_url"] = project["target_url"]
        return json.dumps(audit)
        
    @gl.public.view
    def get_project(self, project_id: u256) -> str:
        if project_id not in self.projects:
            raise Exception("Project not found")
        project = json.loads(self.projects[project_id])
        project["pool_balance"] = str(self.project_balances.get(project_id, u256(0)))
        project["id"] = str(project_id)
        return json.dumps(project)

    @gl.public.view
    def get_all_projects(self) -> str:
        all_projs = []
        for i in range(int(self.project_counter)):
            pid = u256(i)
            if pid in self.projects:
                project = json.loads(self.projects[pid])
                project["pool_balance"] = str(self.project_balances.get(pid, u256(0)))
                project["id"] = str(pid)
                all_projs.append(project)
        return json.dumps(all_projs)

    @gl.public.view
    def get_all_audits(self) -> str:
        all_auds = []
        for i in range(int(self.audit_counter)):
            aid = u256(i)
            if aid in self.audits:
                audit = json.loads(self.audits[aid])
                audit["id"] = str(aid)
                project_id = u256(int(audit["project_id"]))
                if project_id in self.projects:
                    project = json.loads(self.projects[project_id])
                    audit["target_url"] = project["target_url"]
                all_auds.append(audit)
        return json.dumps(all_auds)
