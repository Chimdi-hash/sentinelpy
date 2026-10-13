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
    researcher_counter: u256
    audits: TreeMap[u256, str]
    projects: TreeMap[u256, str]
    project_balances: TreeMap[u256, u256]
    researchers: TreeMap[u256, str]
    researcher_indices: TreeMap[str, u256]

    def __init__(self):
        self.audit_counter = u256(0)
        self.project_counter = u256(0)
        self.researcher_counter = u256(0)

    def _record_researcher_win(self, submitter_addr: str, bounty_wei: int, severity: str):
        addr_str = str(submitter_addr)
        if addr_str not in self.researcher_indices:
            idx = self.researcher_counter
            self.researcher_indices[addr_str] = idx
            rec = {
                "address": addr_str,
                "total_earned_wei": bounty_wei,
                "bounties_won": 1,
                "critical_count": 1 if severity == "CRITICAL" else 0,
                "high_count": 1 if severity == "HIGH" else 0,
                "medium_count": 1 if severity == "MEDIUM" else 0,
                "low_count": 1 if severity == "LOW" else 0,
                "slashed_count": 0
            }
            self.researchers[idx] = json.dumps(rec)
            self.researcher_counter += 1
        else:
            idx = self.researcher_indices[addr_str]
            rec = json.loads(self.researchers[idx])
            rec["total_earned_wei"] = rec.get("total_earned_wei", 0) + bounty_wei
            rec["bounties_won"] = rec.get("bounties_won", 0) + 1
            if severity == "CRITICAL": rec["critical_count"] = rec.get("critical_count", 0) + 1
            elif severity == "HIGH": rec["high_count"] = rec.get("high_count", 0) + 1
            elif severity == "MEDIUM": rec["medium_count"] = rec.get("medium_count", 0) + 1
            elif severity == "LOW": rec["low_count"] = rec.get("low_count", 0) + 1
            self.researchers[idx] = json.dumps(rec)

    def _record_researcher_slash(self, submitter_addr: str):
        addr_str = str(submitter_addr)
        if addr_str not in self.researcher_indices:
            idx = self.researcher_counter
            self.researcher_indices[addr_str] = idx
            rec = {
                "address": addr_str,
                "total_earned_wei": 0,
                "bounties_won": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "slashed_count": 1
            }
            self.researchers[idx] = json.dumps(rec)
            self.researcher_counter += 1
        else:
            idx = self.researcher_indices[addr_str]
            rec = json.loads(self.researchers[idx])
            rec["slashed_count"] = rec.get("slashed_count", 0) + 1
            self.researchers[idx] = json.dumps(rec)

    @gl.public.write.payable
    def register_project(self, target_url: str, content_hash: str) -> u256:
        """Sponsor registers a project, deposits a bounty pool, and pins the content hash."""
        import re
        # Enforce provenance-checked URL: raw.githubusercontent.com with a 40-character commit hash
        if not re.match(r"^https://raw\.githubusercontent\.com/[^/]+/[^/]+/[0-9a-f]{40}/.+", target_url):
            raise Exception("Target URL must be a raw.githubusercontent.com URL containing a full 40-character commit hash for provenance.")

        project_id = self.project_counter
        self.projects[project_id] = json.dumps({
            "target_url": target_url,
            "content_hash": content_hash,
            "sponsor": str(gl.message.sender_address),
            "status": "ACTIVE",
            "pending_audits": 0
        })
        # Store the deposited GEN directly into the project's pool
        self.project_balances[project_id] = u256(int(gl.message.value))
        self.project_counter += 1
        return project_id

    @gl.public.write.payable
    def submit_audit(self, project_id: u256, report: str, start_line: int, end_line: int) -> u256:
        """Auditor submits a specific vulnerability report against a project, bounding the source to specific lines, staking 0.1 GEN."""
        required_wei = int(0.1 * 10**18)
        if gl.message.value < required_wei:
            raise Exception("Insufficient GEN attached to submit an audit (0.1 GEN required stake)")
            
        if not report or not report.strip():
            raise Exception("A concrete vulnerability report must be provided.")

        if len(report) > 2000:
            raise Exception("Report is too long (max 2000 characters).")
            
        if start_line < 1 or end_line < start_line:
            raise Exception("Invalid bounding lines specified.")
            
        if end_line - start_line > 100:
            raise Exception("Maximum bounded slice is 100 lines. Please narrow your report window.")

        if project_id not in self.projects:
            raise Exception("Project not found")
        project = json.loads(self.projects[project_id])
        if project.get("status") in ["COMPROMISED", "CLOSED"]:
            raise Exception(f"Project cannot be audited. Status: {project.get('status')}")

        project["pending_audits"] = project.get("pending_audits", 0) + 1
        self.projects[project_id] = json.dumps(project)

        audit_id = self.audit_counter
        self.audits[audit_id] = json.dumps({
            "project_id": str(project_id),
            "status": "Pending",
            "payout_status": "Pending",
            "analysis": "",
            "report": report.strip(),
            "start_line": int(start_line),
            "end_line": int(end_line),
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
            
        if project.get("pending_audits", 0) > 0:
            raise Exception("Cannot close project while audits are pending")
            
        current_pool = int(self.project_balances.get(project_id, u256(0)))
        
        # Mark as closed
        project["status"] = "CLOSED"
        self.projects[project_id] = json.dumps(project)
        self.project_balances[project_id] = u256(0)
        
        # Refund unused pool
        if current_pool > 0:
            _Recipient(Address(project["sponsor"])).emit_transfer(value=u256(current_pool), on='finalized')
            
        return "Project closed and funds withdrawn"

    @gl.public.write.payable
    def top_up_pool(self, project_id: u256) -> str:
        """Sponsor or community deposits additional GEN into an active project's bounty pool."""
        if project_id not in self.projects:
            raise Exception("Project not found")
        project = json.loads(self.projects[project_id])
        if project.get("status") in ["CLOSED", "COMPROMISED"]:
            raise Exception(f"Cannot top up pool. Project status is {project.get('status')}")
        if gl.message.value <= 0:
            raise Exception("Must attach GEN to top up pool")
            
        current_balance = int(self.project_balances.get(project_id, u256(0)))
        new_balance = current_balance + int(gl.message.value)
        self.project_balances[project_id] = u256(new_balance)
        return f"Pool topped up successfully. New balance: {new_balance}"

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
        
        # Always decrement pending audits when execution starts
        project["pending_audits"] = max(0, project.get("pending_audits", 0) - 1)
        self.projects[project_id] = json.dumps(project)
        
        if project.get("status") in ["CLOSED", "COMPROMISED"]:
            audit["status"] = "Error"
            audit["analysis"] = f"Audit aborted: Project is {project.get('status')}"
            self.audits[audit_id] = json.dumps(audit)
            
            submitter_addr = Address(audit["submitter"])
            stake_wei = int(audit.get("stake", int(0.1 * 10**18)))
            _Recipient(submitter_addr).emit_transfer(value=u256(stake_wei), on='finalized')
            return f"Project is {project.get('status')}"
            
        target_url = project["target_url"]
        
        # 1. Fetch Source Code directly from URL to prevent user manipulation
        def fetch_source() -> str:
            response = gl.nondet.web.get(target_url)
            MAX_BYTES = 500 * 1024  # 500 KB maximum response size
            if len(response.body) > MAX_BYTES:
                raise Exception(f"Remote file exceeds maximum allowed size of {MAX_BYTES} bytes.")
            return response.body.decode("utf-8")

        try:
            source_code = gl.eq_principle.strict_eq(fetch_source)
            # Verify the content hash matches the registered artifact
            fetched_hash = hashlib.sha256(source_code.encode("utf-8")).hexdigest()
            if fetched_hash != project.get("content_hash", ""):
                raise Exception(f"Content hash mismatch! Expected {project.get('content_hash')} but got {fetched_hash}. The audited URL has changed.")
            
            # Slice source code to bounded subset based on auditor's start/end lines
            # Add small padding of 5 lines for context
            lines = source_code.split("\n")
            start_idx = max(0, audit.get("start_line", 1) - 6)
            end_idx = min(len(lines), audit.get("end_line", len(lines)) + 5)
            bounded_source = "\n".join(lines[start_idx:end_idx])

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

AUDITOR'S SPECIFIC VULNERABILITY REPORT:
{audit.get('report', 'No report provided.')}

BOUNDED SOURCE CODE (Lines {start_idx+1} to {end_idx}):
{bounded_source}

CRITICAL SECURITY DIRECTIVE:
You are an expert blockchain security auditor. The auditor has submitted a specific vulnerability report for this source code.
Your task is to adjudicate THIS SPECIFIC reported vulnerability. Do not perform a broad whole-source scan for other issues.
Analyze the source code to determine if the SPECIFIC vulnerability described in the report is valid, reachable, and has a real security impact.

If valid, assess its impact severity using standard CVSS guidelines:
- CRITICAL: Direct, unrestricted loss of funds, full protocol insolvency, or permanent contract freeze/takeover.
- HIGH: Significant theft of funds under specific conditions, or severe unauthorized state/permission tampering.
- MEDIUM: Conditional exploit, logic manipulation, or denial-of-service without permanent fund loss.
- LOW: Minor logic flaw, informational issue, or edge-case without financial impact.

Return a JSON response with EXACTLY these keys:
- 'decision': 'MALICIOUS' (if the reported bug is valid and impactful) or 'SECURE' (if the reported bug is invalid, unreachable, or harmless).
- 'severity': 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', or 'NONE' (if SECURE).
- 'vulnerability_type': Short name of the vulnerability (e.g. 'Reentrancy', 'Access Control', 'None')
- 'evidence_line_snippet': The exact line of code that causes the issue (or 'None')
- 'reasoning': Explanation of why the reported bug is valid or invalid, justifying the severity level.
"""
            
        response = gl.eq_principle.prompt_non_comparative(
            get_audit_context,
            task="Adjudicate the specific vulnerability report against the provided source code and classify severity.",
            criteria="Validators MUST verify that the reported vulnerability is actually reachable and impactful in the provided bounded source code slice. Validators MUST verify that the extracted 'evidence_line_snippet' actually exists verbatim in the bounded source code slice. Reject if the snippet is fabricated, or if the reported bug is not genuinely exploitable. If valid, classify severity accurately as CRITICAL, HIGH, MEDIUM, or LOW."
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
            expected_keys = {"decision", "severity", "vulnerability_type", "evidence_line_snippet", "reasoning"}
            if set(result.keys()) != expected_keys:
                raise Exception(f"Exact schema mismatch in AI response. Expected exactly: {expected_keys}")
            if result["decision"] not in ["SECURE", "MALICIOUS"]:
                raise Exception(f"Invalid decision: {result['decision']}")
            if result["severity"] not in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]:
                raise Exception(f"Invalid severity: {result['severity']}")
            if result["decision"] == "SECURE" and result["severity"] != "NONE":
                raise Exception("SECURE decision must have severity 'NONE'.")
            if result["decision"] == "MALICIOUS" and result["severity"] not in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                raise Exception("MALICIOUS decision must specify CRITICAL, HIGH, MEDIUM, or LOW severity.")
            
            # 2. Verify cited evidence before settlement
            if result["decision"] == "MALICIOUS":
                snippet = result.get("evidence_line_snippet", "")
                if snippet == "None" or not snippet.strip():
                    raise Exception("MALICIOUS result must provide a valid evidence_line_snippet.")
                if snippet not in bounded_source:
                    raise Exception("Fabricated evidence: The cited line snippet was not found in the bounded source slice.")

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
        audit["severity"] = result.get("severity", "NONE")
        
        # Format the analysis to display the substantive evidence nicely
        formatted_analysis = (
            f"Decision: {result.get('decision', '')}\n"
            f"Severity: {result.get('severity', 'NONE')}\n"
            f"Vulnerability: {result.get('vulnerability_type', 'None')}\n"
            f"Evidence Snippet: {result.get('evidence_line_snippet', 'None')}\n"
            f"Reasoning: {result.get('reasoning', '')}"
        )
        audit["analysis"] = formatted_analysis
        
        # 3. Solvent Multi-Tier Payout Logic
        submitter_addr = Address(audit["submitter"])
        stake_wei = int(audit.get("stake", int(0.1 * 10**18)))
        
        if audit["status"] == "MALICIOUS":
            severity = result["severity"]
            severity_bounties = {
                "CRITICAL": int(2.0 * 10**18),
                "HIGH": int(1.0 * 10**18),
                "MEDIUM": int(0.4 * 10**18),
                "LOW": int(0.1 * 10**18),
            }
            bounty_wei = severity_bounties.get(severity, int(1.0 * 10**18))
            current_pool = int(self.project_balances.get(project_id, u256(0)))
            
            if severity == "CRITICAL":
                # Critical bug: Compromises whole project & sweeps remaining escrow
                project["status"] = "COMPROMISED"
                self.projects[project_id] = json.dumps(project)
                
                if current_pool >= bounty_wei:
                    # Pool is solvent. Payout stake + bounty to auditor
                    _Recipient(submitter_addr).emit_transfer(value=u256(bounty_wei + stake_wei), on='finalized')
                    audit["payout_status"] = "BOUNTY_PAID"
                    self._record_researcher_win(audit["submitter"], bounty_wei, severity)
                    
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
                    self._record_researcher_win(audit["submitter"], current_pool, severity)
                    self.project_balances[project_id] = u256(0)
            else:
                # Non-critical bug (HIGH, MEDIUM, LOW): Keep project ACTIVE if solvent!
                if current_pool >= bounty_wei:
                    _Recipient(submitter_addr).emit_transfer(value=u256(bounty_wei + stake_wei), on='finalized')
                    audit["payout_status"] = "BOUNTY_PAID"
                    self._record_researcher_win(audit["submitter"], bounty_wei, severity)
                    
                    # Deduct bounty from pool, project stays ACTIVE!
                    new_pool = current_pool - bounty_wei
                    self.project_balances[project_id] = u256(new_pool)
                    self.projects[project_id] = json.dumps(project)
                else:
                    # Pool underfunded for this tier: Settle remaining pool and mark project COMPROMISED
                    project["status"] = "COMPROMISED"
                    self.projects[project_id] = json.dumps(project)
                    audit["payout_status"] = "POOL_DEPLETED_PARTIAL_PAYOUT"
                    payout_amount = current_pool + stake_wei
                    _Recipient(submitter_addr).emit_transfer(value=u256(payout_amount), on='finalized')
                    self._record_researcher_win(audit["submitter"], current_pool, severity)
                    self.project_balances[project_id] = u256(0)
        else:
            # Code is SECURE. False alarm by auditor.
            audit["payout_status"] = "STAKE_SLASHED"
            # Explicitly burn the 0.1 GEN stake by sending it to the null address
            _Recipient(Address("0x0000000000000000000000000000000000000000")).emit_transfer(value=u256(stake_wei), on='finalized')
            self._record_researcher_slash(audit["submitter"])
        
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

    @gl.public.view
    def get_leaderboard(self) -> str:
        all_researchers = []
        for i in range(int(self.researcher_counter)):
            rid = u256(i)
            if rid in self.researchers:
                all_researchers.append(json.loads(self.researchers[rid]))
        all_researchers.sort(key=lambda x: x.get("total_earned_wei", 0), reverse=True)
        return json.dumps(all_researchers)

    @gl.public.view
    def get_researcher(self, addr: str) -> str:
        addr_str = str(addr)
        if addr_str not in self.researcher_indices:
            return json.dumps({
                "address": addr_str,
                "total_earned_wei": 0,
                "bounties_won": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "slashed_count": 0
            })
        idx = self.researcher_indices[addr_str]
        return self.researchers[idx]
