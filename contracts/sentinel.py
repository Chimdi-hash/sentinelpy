# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import urllib.parse
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
    def register_project(self, target_url: str) -> u256:
        """Sponsor registers a project and deposits a bounty pool."""
        try:
            parsed = urllib.parse.urlparse(target_url)
            if parsed.scheme not in ['http', 'https']:
                raise Exception("Invalid URL scheme. Must be http or https.")
        except Exception as e:
            raise Exception(f"Invalid Target URL format: {str(e)}")

        project_id = self.project_counter
        self.projects[project_id] = json.dumps({
            "target_url": target_url,
            "sponsor": str(gl.message.sender_address)
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

        audit_id = self.audit_counter
        self.audits[audit_id] = json.dumps({
            "project_id": str(project_id),
            "status": "Pending",
            "payout_status": "Pending",
            "analysis": "",
            "submitter": str(gl.message.sender_address)
        })
        self.audit_counter += 1
        return audit_id

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
            # Truncate to prevent huge context window crashes
            source_code = source_code[:4000] 
        except Exception as e:
            audit["status"] = "Error"
            audit["analysis"] = f"Failed to fetch source code from {target_url}: {str(e)}"
            self.audits[audit_id] = json.dumps(audit)
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
            criteria="The result must be a valid JSON object containing exactly 'decision', 'vulnerability_type', 'evidence_line_snippet', and 'reasoning'."
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
        except Exception as e:
            audit["status"] = "Error"
            audit["analysis"] = "Failed to parse AI consensus JSON"
            self.audits[audit_id] = json.dumps(audit)
            return str(e)
            
        audit["status"] = result.get("decision", "SECURE")
        
        # Format the analysis to display the substantive evidence nicely
        formatted_analysis = (
            f"Vulnerability: {result.get('vulnerability_type', 'None')}\n"
            f"Evidence Snippet: {result.get('evidence_line_snippet', 'None')}\n"
            f"Reasoning: {result.get('reasoning', '')}"
        )
        audit["analysis"] = formatted_analysis
        
        # 3. Solvent Payout Logic
        submitter_addr = Address(audit["submitter"])
        stake_wei = int(0.1 * 10**18)
        
        if audit["status"] == "MALICIOUS":
            bounty_wei = int(1.0 * 10**18)
            current_pool = int(self.project_balances.get(project_id, u256(0)))
            
            if current_pool >= bounty_wei:
                # Pool is solvent. Deduct bounty from pool.
                self.project_balances[project_id] = u256(current_pool - bounty_wei)
                # Payout Stake + Bounty to Auditor
                _Recipient(submitter_addr).emit_transfer(value=u256(bounty_wei + stake_wei), on='finalized')
                audit["payout_status"] = "BOUNTY_PAID"
            else:
                # Pool depleted. Refund stake only.
                audit["payout_status"] = "POOL_DEPLETED"
                _Recipient(submitter_addr).emit_transfer(value=u256(stake_wei), on='finalized')
        else:
            # Code is SECURE. False alarm by auditor.
            audit["payout_status"] = "STAKE_SLASHED"
            # Stake is transferred to the Sponsor's pool
            current_pool = int(self.project_balances.get(project_id, u256(0)))
            self.project_balances[project_id] = u256(current_pool + stake_wei)
        
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
