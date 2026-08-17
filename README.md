# SentinelPy: AI-Governed Smart Contract Security & Bug Bounty Platform

![SentinelPy Dashboard](https://img.shields.io/badge/Status-Live%20on%20GenLayer%20Studionet-success)
![Framework](https://img.shields.io/badge/Framework-Next.js%2014-black)
![AI Engine](https://img.shields.io/badge/AI_Consensus-GenVM-purple)

SentinelPy is a decentralized security platform built on **GenLayer** that uses Intelligent Smart Contracts to autonomously audit code, detect vulnerabilities, and financially reward or penalize auditors without human intervention. 

## 🚀 The Vision: A Solvent Dual-Role Marketplace

SentinelPy reimagines the traditional bug bounty model by replacing human judges with GenLayer's **GenVM** artificial intelligence and establishing a solvent, sponsor-funded economy.

1. **Sponsors (Project Owners):** Register their project's codebase (via raw GitHub or IPFS URL) and deposit GEN tokens to fund a Bounty Pool.
2. **Auditors (Security Researchers):** Request AI audits against registered projects by staking a small fee (0.1 GEN).
3. **AI Adjudicator (GenVM):** The Intelligent Smart Contract *autonomously fetches* the target URL's source code, completely preventing user-manipulated payloads. The network of GenVM nodes analyzes the code, demanding exact, substantive evidence (vulnerability type and line snippet).

## ✨ Core Features

* **Authenticated Code Fetching:** Users cannot copy/paste code (which prevents prompt injection). The Intelligent Contract leverages `gl.get_webpage(url)` to securely pull the exact codebase for validators to analyze.
* **Substantive AI Consensus:** Instead of a simple "Secure/Malicious" tag, the GenVM consensus mandates strict JSON schemas proving exactly which line caused the vulnerability.
* **Solvent Escrow System:** 
  * **Vulnerability Found:** The AI verifies a vulnerability. The Auditor is rewarded with a **Bounty (+1.0 GEN)** drawn directly from the Sponsor's pool, and their stake is returned.
  * **False Alarm (Secure):** The AI verifies the code is safe. The Auditor's stake is **Slashed (-0.1 GEN)** and transferred to the Sponsor's pool as a penalty.

## 🏗️ Technical Architecture

1. **Frontend:** Built with Next.js (React) and styled with raw CSS for a dark, glassmorphism "cyber-security" aesthetic. It's fully mobile-responsive and connects to the GenLayer Studionet via `genlayer-js` and `viem`.
2. **Intelligent Smart Contract:** Written in Python using the `genlayer` SDK. It maintains the registry of active Sponsor Pools and Audits, orchestrates the `get_webpage` fetching, and uses `gl.eq_principle.prompt_non_comparative` for decentralized AI consensus.

## 🔗 Live Contract

The Intelligent Smart Contract is currently deployed on the **GenLayer Studionet**:
`0xB10AFC4E784D40b6C9A6B0883310aC8261391582`

## 🛠️ Local Development

First, clone the repository and install the dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You will need a Web3 Wallet (like MetaMask) connected to the GenLayer Studionet to interact with the platform.

## 🧪 Testing the AI Consensus (Sponsor/Auditor Flow)

To test the GenVM's ability to fetch, analyze, and adjudicate payouts, you can use the test smart contracts we have hosted in this repository.

### Scenario 1: Vulnerable Contract (Bounty Paid)
1. **Sponsor:** As a Project Owner, register a new project on the dashboard. Use the following Raw GitHub URL and deposit `5.0 GEN` into the bounty pool:
   `https://raw.githubusercontent.com/Chimdi-hash/sentinelpy/main/public/examples/vulnerable_bank.sol`
2. **Auditor:** Switch wallets (or act as the hacker). Find the project in the Active Bug Bounties list and click **Hunt Bugs (Stake 0.1)**. 
3. **Execute:** Once the audit request is created, find it in the Pending Audits table and click **Audit ⯆**.
4. **Result:** GenVM will fetch the code, detect the **Reentrancy** vulnerability, output the exact line snippet as evidence, return your 0.1 GEN stake, and pay you a 1.0 GEN Bounty from the Sponsor's pool!

### Scenario 2: Secure Contract (Stake Slashed)
1. **Sponsor:** Register a new project using the secure contract URL and deposit `5.0 GEN`:
   `https://raw.githubusercontent.com/Chimdi-hash/sentinelpy/main/public/examples/secure_bank.sol`
2. **Auditor:** Submit an audit request and stake `0.1 GEN`.
3. **Execute:** Run the AI consensus. 
4. **Result:** GenVM will fetch the code, verify the Checks-Effects-Interactions pattern is used correctly, and adjudicate the codebase as `SECURE`. As a penalty for a false alarm, the auditor's `0.1 GEN` stake is slashed and transferred to the Sponsor's pool!
