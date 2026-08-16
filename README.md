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
`0x6669E1583F8331083B5ECB17b438FEaB6C683E9C`

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
