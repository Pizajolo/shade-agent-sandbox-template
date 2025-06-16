import { contracts, chainAdapters, utils } from "chainsig.js";
import { createPublicClient, http, serializeTransaction, toBytes, keccak256, recoverTransactionAddress, recoverAddress } from "viem";
import { Contract, JsonRpcProvider } from "ethers";
import { signWithAgent, getAgentAccount } from '@neardefi/shade-agent-js';

const { toRSV } = utils.cryptography;

// Configuration
const contractId = process.env.NEXT_PUBLIC_contractId || `v1.signer-prod.testnet`;

// Sepolia testnet configuration
export const thetaTestnetRpcUrl = 'https://sepolia.drpc.org';
export const oracleContractAddress = '0xb4f409B7304505398c1895358A3C336dca6a8C47';

// Smart contract ABI for oracle operations
export const oracleContractAbi = [
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "initialValue",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			}
		],
		"name": "createOracle",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "OnlyCreatorCanUpdate",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OracleAlreadyExists",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OracleNotExists",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "description",
				"type": "string"
			}
		],
		"name": "OracleCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "hasError",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "blockNumber",
				"type": "uint256"
			}
		],
		"name": "OracleErrorSet",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newValue",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "blockNumber",
				"type": "uint256"
			}
		],
		"name": "OracleUpdated",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"internalType": "bool",
				"name": "errorStatus",
				"type": "bool"
			}
		],
		"name": "setOracleError",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "newValue",
				"type": "uint256"
			}
		],
		"name": "updateOracle",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "getOracle",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastUpdateBlock",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "hasError",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "getOracleCreator",
		"outputs": [
			{
				"internalType": "address",
				"name": "creator",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "getOracleErrorStatus",
		"outputs": [
			{
				"internalType": "bool",
				"name": "hasError",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "getOracleValue",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "getOracleValueSafe",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "oracleId",
				"type": "bytes32"
			}
		],
		"name": "oracleExists",
		"outputs": [
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Initialize MPC contract for cross-chain signatures
const MPC_CONTRACT = new contracts.ChainSignatureContract({
  networkId: `testnet`,
  contractId: `v1.signer-prod.testnet`,
});

// Create viem public client for Ethereum operations
const publicClient = createPublicClient({
    transport: http(thetaTestnetRpcUrl),
});

// Initialize EVM adapter for cross-chain operations
export const Evm = (new chainAdapters.evm.EVM({
    publicClient,
    contract: MPC_CONTRACT
}));

// Create ethers contract instance for read operations
const provider = new JsonRpcProvider(thetaTestnetRpcUrl);
const contract = new Contract(oracleContractAddress, oracleContractAbi, provider);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert string to bytes32 hash for smart contract compatibility
 * @param {string} str - String to convert (oracle ID)
 * @returns {string} Keccak256 hash as bytes32
 */
function stringToBytes32(str) {
  return keccak256(new TextEncoder().encode(str));
}

/**
 * Convert BigInt balance to decimal string with specified precision
 * @param {BigInt} bigIntValue - Raw balance value
 * @param {number} decimals - Number of decimal places (default 18 for ETH)
 * @param {number} decimalPlaces - Display precision (default 6)
 * @returns {string} Formatted decimal string
 */
export function convertToDecimal(bigIntValue, decimals, decimalPlaces = 6) {
  let strValue = bigIntValue.toString();
  
  if (strValue.length <= decimals) {
    strValue = strValue.padStart(decimals + 1, '0');
  }

  const decimalPos = strValue.length - decimals;
  const result = strValue.slice(0, decimalPos) + '.' + strValue.slice(decimalPos);

  return parseFloat(result).toFixed(decimalPlaces);
}

// ============================================================================
// READ OPERATIONS (No gas required)
// ============================================================================

/**
 * Get wallet balance using ethers provider (more reliable than Evm.getBalance)
 * @param {string} address - Ethereum wallet address
 * @returns {Promise<BigInt>} Balance in Wei
 */
export async function getWalletBalanceEthers(address) {
  try {
    const balance = await provider.getBalance(address);
    return BigInt(balance.toString());
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
}

/**
 * Get oracle data from the smart contract
 * @param {string} oracleIdString - Human-readable oracle ID
 * @returns {Array} [value, lastUpdateBlock, creator, hasError, description]
 */
export async function getOracle(oracleIdString) {
  const oracleId = stringToBytes32(oracleIdString);
  return await contract.getOracle(oracleId);
}

/**
 * Get the creator address of an oracle
 * @param {string} oracleIdString - Human-readable oracle ID
 * @returns {string} Creator's Ethereum address
 */
export async function getOracleCreator(oracleIdString) {
  const oracleId = stringToBytes32(oracleIdString);
  return await contract.getOracleCreator(oracleId);
}

/**
 * Check if an oracle exists on the blockchain
 * @param {string} oracleIdString - Human-readable oracle ID
 * @returns {boolean} True if oracle exists
 */
export async function checkOracleExists(oracleIdString) {
  const oracleId = stringToBytes32(oracleIdString);
  return await contract.oracleExists(oracleId);
}

/**
 * Get oracle price with fallback for backward compatibility
 * @param {string} oracleIdString - Oracle ID (default: 'eth-price')
 * @returns {BigInt} Oracle value in cents, or default value if not found
 */
export async function getContractPrice(oracleIdString = 'eth-price') {
  try {
    const oracleId = stringToBytes32(oracleIdString);
    const oracleData = await contract.getOracle(oracleId);
    return oracleData[0]; // Return the value (first element)
  } catch (error) {
    console.log('Error getting contract price, returning default:', error);
    // Return default value if oracle doesn't exist (3000 cents = $30.00)
    return BigInt(300000);
  }
}

// ============================================================================
// WRITE OPERATIONS (Require gas and signatures)
// ============================================================================

/**
 * Prepare oracle creation transaction
 * @param {string} oracleIdString - Human-readable oracle ID
 * @param {number} initialValue - Initial price value in cents
 * @param {string} description - Oracle description
 * @param {string} derivationPath - Key derivation path for signing
 * @returns {Object} {transaction, hashesToSign, senderAddress}
 */
export async function createOracle(oracleIdString, initialValue, description, derivationPath) {
  const oracleId = stringToBytes32(oracleIdString);
  
  // Derive wallet address for this oracle
  const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
    contractId,
    derivationPath
  );
  
  // Encode function call data
  const data = contract.interface.encodeFunctionData('createOracle', [oracleId, initialValue, description]);
  
  // Prepare unsigned transaction (nonce handled automatically)
  const { transaction, hashesToSign } = await Evm.prepareTransactionForSigning({
    from: senderAddress,
    to: oracleContractAddress,
    data,
  });

  return { transaction, hashesToSign, senderAddress };
}

/**
 * Prepare oracle update transaction
 * @param {string} oracleIdString - Human-readable oracle ID
 * @param {number} newValue - New price value in cents
 * @param {string} derivationPath - Key derivation path for signing
 * @returns {Object} {transaction, hashesToSign, senderAddress}
 */
export async function updateOracle(oracleIdString, newValue, derivationPath) {
  const oracleId = stringToBytes32(oracleIdString);
  
  // Derive wallet address for this oracle
  const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
    contractId,
    derivationPath
  );
  
  // Encode function call data
  const data = contract.interface.encodeFunctionData('updateOracle', [oracleId, newValue]);
  
  // Prepare unsigned transaction (nonce handled automatically)
  const { transaction, hashesToSign } = await Evm.prepareTransactionForSigning({
    from: senderAddress,
    to: oracleContractAddress,
    data,
  });
  
  return { transaction, hashesToSign, senderAddress };
}

/**
 * Prepare oracle error status update transaction
 * @param {string} oracleIdString - Human-readable oracle ID
 * @param {boolean} errorStatus - True to mark as error, false to clear
 * @param {string} derivationPath - Key derivation path for signing
 * @returns {Object} {transaction, hashesToSign, senderAddress}
 */
export async function setOracleError(oracleIdString, errorStatus, derivationPath) {
  const oracleId = stringToBytes32(oracleIdString);
  
  // Derive wallet address for this oracle
  const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
    contractId,
    derivationPath
  );
  
  // Encode function call data
  const data = contract.interface.encodeFunctionData('setOracleError', [oracleId, errorStatus]);
  
  // Prepare unsigned transaction
  const { transaction, hashesToSign } = await Evm.prepareTransactionForSigning({
    from: senderAddress,
    to: oracleContractAddress,
    data,
  });

  return { transaction, hashesToSign, senderAddress };
}

/**
 * Sign and broadcast a prepared transaction using Shade Agent
 * @param {Object} transaction - Prepared transaction object
 * @param {Array} hashesToSign - Array of hashes to sign
 * @param {string} derivationPath - Key derivation path for signing
 * @returns {Object} Transaction result with hash and block number
 */
export async function signAndBroadcastTransaction(transaction, hashesToSign, derivationPath) {
  try {
    // Sign transaction using Shade Agent
    const signRes = await signWithAgent(derivationPath, hashesToSign[0]);
    
    // Finalize transaction with signature
    const signedTransaction = Evm.finalizeTransactionSigning({
      transaction,
      rsvSignatures: [toRSV(signRes)],
    });
    
    // Broadcast to network
    const txResult = await Evm.broadcastTx(signedTransaction);
    
    return txResult;
  } catch (error) {
    console.error('Error signing and broadcasting transaction:', error);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('could not replace existing tx')) {
      throw new Error('Transaction replacement error - please wait a moment before trying again.');
    } else if (error.message && error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds for transaction.');
    } else if (error.message && error.message.includes('already known')) {
      throw new Error('Transaction already pending - please wait for confirmation.');
    } else if (error.details && error.details.includes('ALREADY_EXISTS')) {
      throw new Error('Transaction already pending - please wait for confirmation.');
    } else if (error.message && error.message.includes('nonce too low')) {
      throw new Error('Nonce error - transaction may have already been processed.');
    } else if (error.details && error.details.includes('nonce too low')) {
      throw new Error('Nonce error - transaction may have already been processed.');
    } else {
      throw new Error('Failed to broadcast transaction.');
    }
  }
}
