# Shade Agent - Dynamic Oracle System

> [!WARNING]  
> This technology has not yet undergone a formal audit. Use at your own risk. Please conduct your own due diligence and exercise caution before integrating or relying on it in production environments.

This is a monorepo for an advanced Shade Agent Oracle system that provides a dynamic, configurable solution for bringing off-chain data on-chain through NEAR and Phala Cloud.

## What This Oracle Does

This system provides a **Dynamic API Oracle** that goes beyond simple price feeds. Key features include:

### 🚀 **Dynamic Endpoint Management**
- **Smart contract interface** for dynamically adding API endpoints without code changes
- **Flexible data extraction** - specify exactly which fields from API responses should be captured
- **Runtime configuration** - no need to redeploy contracts when adding new data sources

### ⚡ **Automated Updates**
- **Gas-powered automation** - updates continue as long as gas tokens are available in your oracle's derived wallet address
- **Configurable intervals** - set update frequency in minutes based on your needs
- **Reliable execution** - runs in a secure TEE (Trusted Execution Environment)

### 🎯 **Smart Data Handling**
- **Selective data extraction** from complex API responses
- **On-chain data provision** for smart contracts and dApps
- **Verifiable oracle operations** through Shade Agent technology

### 💰 **Cost Management**
- **Pay-per-use model** - oracle operates using gas from your derived wallet
- **Transparent costs** - you control when and how often data updates occur
- **No subscription fees** - only pay for the gas you consume

## Current Capabilities

- ✅ Dynamic API endpoint registration through smart contract
- ✅ Configurable data field extraction from JSON responses  
- ✅ Automated periodic updates with customizable intervals
- ✅ Gas-managed operation lifecycle
- ✅ Secure TEE-based execution on Phala Cloud
- ✅ NEAR blockchain integration

## Roadmap & Next Steps

### 🔧 **Stability & Reliability**
- Enhanced error handling and retry mechanisms
- Better monitoring and alerting for oracle health
- Improved gas estimation and management

### 📊 **Extended Data Support**
- Support for non-numeric data types (strings, arrays, objects)
- Complex data transformation capabilities

### 🔐 **Advanced API Integration**
- API key authentication support
- OAuth and other authentication methods
- Rate limiting and request management

### 🛡️ **Redundancy & Security**
- Multi-source and Redundant data verification

### 🌐 **Blockchain Expansion**
- **Theta Blockchain integration** - primary target for next release

[Pull request for chainsig.js adding Theta Support](https://github.com/NearDeFi/chainsig.js/pull/9)

For full instructions on this repository please refer to our [docs](https://docs.near.org/ai/shade-agents/sandbox/sandbox-deploying).

## Prerequisites

- First, `clone` this template.

```bash
git clone https://github.com/NearDeFi/shade-agent-sandbox-template shade-agent
cd shade-agent
```

- Install NEAR and Shade Agent tooling:

```bash
# Install the NEAR CLI
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh

# Install the Shade Agent CLI
npm i -g @neardefi/shade-agent-cli

# Install the Phala Cloud CLI
npm install -g phala
```

If you already have the NEAR CLI installed, check that you have the `most recent version`.

- Create a `NEAR testnet account` and record the account name and `seed phrase`:

```bash
near account create-account sponsor-by-faucet-service <example-name.testnet> autogenerate-new-keypair print-to-terminal network-config testnet create
```

- Install Docker for [Mac](https://docs.docker.com/desktop/setup/install/mac-install/) or [Linux](https://docs.docker.com/desktop/setup/install/linux/) and set up an account.

- Set up a free Phala Cloud account at https://cloud.phala.network/register then get an API key from https://cloud.phala.network/dashboard/tokens.

What is a Phala Cloud?

Phala Cloud is a service that offers secure and private hosting in a TEE using [Dstack](https://docs.phala.network/overview/phala-network/dstack). Phala Cloud makes it easy to run a TEE, that's why we use it in our template!

---

## Local Development

- Rename the `.env.development.local.example` file name to `.env.development.local` and configure your environment variables.

- Start up Docker:

For Linux

```bash
sudo systemctl start docker
```

For Mac

Simply open the Docker Desktop application or run: 

```bash
open -a Docker
```

- Make sure the `NEXT_PUBLIC_contractId` prefix is set to `ac.proxy.` followed by your NEAR accountId.

- In one terminal, run the Shade Agent CLI:

```bash
shade-agent-cli
```

The CLI will prompt you to enter your `sudo password`. 

- In another terminal, start the frontend :

```bash
yarn
yarn start
```

---

## TEE Deployment 

- Change the `NEXT_PUBLIC_contractId` prefix to `ac.sandbox.` followed by your NEAR accountId.

- Run the Shade Agent CLI

```bash
shade-agent-cli
```

The CLI will prompt you to enter your `sudo password`. 

This command will take about 5 minutes to complete.

- Head over to your Phala Cloud dashboard https://cloud.phala.network/dashboard

- Once the deployment is finished, click on your deployment, then head to the `network tab` and open the endpoint that is running on `port 3000`.
