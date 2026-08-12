# SentinelPy: AI-Governed Smart Contract Security & Bug Bounty Platform

![SentinelPy Dashboard](https://img.shields.io/badge/Status-Live%20on%20GenLayer%20Studionet-success)
![Framework](https://img.shields.io/badge/Framework-Next.js%2014-black)
![AI Engine](https://img.shields.io/badge/AI_Consensus-GenVM-purple)

SentinelPy is a decentralized security platform built on **GenLayer** that uses Intelligent Smart Contracts to autonomously audit code, detect vulnerabilities, and financially reward or penalize auditors without human intervention.

## 🚀 The Vision

SentinelPy reimagines the traditional bug bounty model by replacing human judges with GenLayer's **GenVM** artificial intelligence. 

Security researchers and developers can submit smart contract source code to the platform along with a staked bounty in GEN tokens. Once submitted, the SentinelPy Intelligent Smart Contract autonomously reads the source code, analyzes its logic for critical vulnerabilities, and reaches a network consensus on the code's safety.

## ✨ Core Features

* **AI-Powered Code Audits:** Leverages GenLayer's LLM consensus to trace and analyze smart contract payloads (like Solidity or Python) for logic flaws such as reentrancy or prompt injection attacks.
* **Trustless Escrow System:** 
  * **Malicious (Vulnerable):** If the AI detects a vulnerability, the contract is flagged as a threat and the user's staked tokens are **Burned** (-1.0 GEN).
  * **Secure (Safe):** If the AI verifies the code is safe, the submitter is **Rewarded** with their stake plus a bonus (+1.5 GEN).
* **Real-time Threat Intelligence:** A dashboard that indexes and categorizes all evaluated contracts into Malicious Threats, Verified Contracts, and a Global Audit Ledger.

## 🏗️ Technical Architecture

1. **Frontend:** Built with Next.js (React) and styled with raw CSS for a dark, glassmorphism "cyber-security" aesthetic. It's fully mobile-responsive and connects to the GenLayer Studionet via `genlayer-js` and `viem`.
2. **Intelligent Smart Contract:** Written in Python using the `genlayer` SDK. It stores the registry of audits and uses `gl.eq_principle.prompt_non_comparative` to ask the GenVM nodes to collectively analyze the source code and return a JSON verdict (`SECURE` or `MALICIOUS`).

## 🔗 Live Contract

The Intelligent Smart Contract is currently deployed on the **GenLayer Studionet**:
`0x707863d36a3407B578087e493b1FcA48c948Cd70`

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

## 🧪 Testing the AI Consensus

You can test the AI by pasting the following vulnerable Solidity code into the dashboard. Watch the GenVM catch the reentrancy attack and burn the stake!

```solidity
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Insufficient balance");
        
        // VULNERABILITY: External call happens before state update
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Failed to send Ether");

        balances[msg.sender] = 0;
    }
}
```
