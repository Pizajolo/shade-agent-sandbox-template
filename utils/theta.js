import { contracts, chainAdapters } from "chainsig.js";
import { createPublicClient, http, serializeTransaction, toBytes, keccak256 } from "viem";
import { Contract, JsonRpcProvider } from "ethers";

export const thetaTestnetRpcUrl = 'https://eth-rpc-api-testnet.thetatoken.org/rpc';
export const oracleContractAddress = '0x0f11e94e727e255f6c00b8932b277b4474004c09';

export const oracleContractAbi = [
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
	}
]

const MPC_CONTRACT = new contracts.ChainSignatureContract({
  networkId: `testnet`,
  contractId: `v1.signer-prod.testnet`,
});

const publicClient = createPublicClient({
    transport: http(thetaTestnetRpcUrl),
  });

export const Evm = (new chainAdapters.evm.EVM({
    publicClient,
    contract: MPC_CONTRACT
}));

// Override attachGasAndNonce to avoid EIP-1559 fees and use legacy gasPrice
Evm.attachGasAndNonce = async function (transaction) {
  console.log("transaction attachGasAndNonceLegacy", transaction);
  const gasPrice = await this.client.getGasPrice();
  const nonce = await this.client.getTransactionCount({
    address: transaction.from,
  });

  const { from, ...rest } = transaction;

  return {
    ...rest,
    gasPrice: BigInt(gasPrice),
    nonce: BigInt(nonce),
    value: rest.value !== undefined ? BigInt(rest.value) : undefined,
    gas: rest.gas !== undefined ? BigInt(rest.gas) : BigInt(21000),
    chainId: await this.client.getChainId(),
    type: 'legacy',
  };
};

// Override prepareTransactionForSigning globally
Evm.prepareTransactionForSigning = async function (transactionRequest) {
  console.log("transaction prepareTransactionForSigning", transactionRequest);
  const transaction = await this.attachGasAndNonce(transactionRequest);
  const serializedTx = serializeTransaction(transaction); // uses legacy format now
  const txHash = toBytes(keccak256(serializedTx));

  return {
    transaction,
    hashesToSign: [Array.from(txHash)],
  };
};

// Override finalizeTransactionSigning to work with Theta
Evm.finalizeTransactionSigning = function ({
  transaction,
  rsvSignatures,
}) {
  console.log("transaction finalizeTransactionSigning", transaction, rsvSignatures);
  // Ensure legacy transaction format
  const txLegacy = {
    to: transaction.to,
    value: BigInt(transaction.value),
    gas: BigInt(transaction.gas || transaction.gasLimit),
    nonce: BigInt(transaction.nonce),
    // gasLimit: BigInt(transaction.gas || transaction.gasLimit),
    gasPrice: BigInt(transaction.gasPrice),
    chainId: Number(transaction.chainId),
    type: 'legacy',
  };

  // Use v, not yParity
  const signature = {
    v: BigInt(rsvSignatures[0].v),
    r: `0x${rsvSignatures[0].r.padStart(64, '0')}`,
    s: `0x${rsvSignatures[0].s.padStart(64, '0')}`,
  };

  return serializeTransaction(txLegacy, signature);
};

const provider = new JsonRpcProvider(thetaTestnetRpcUrl);
const contract = new Contract(oracleContractAddress, oracleContractAbi, provider);

export async function getOracle(oracleId) {
  return await contract.getOracle(oracleId);
}

export function convertToDecimal(bigIntValue, decimals, decimalPlaces = 6) {
  let strValue = bigIntValue.toString();
  
  if (strValue.length <= decimals) {
    strValue = strValue.padStart(decimals + 1, '0');
  }

  const decimalPos = strValue.length - decimals;

  const result = strValue.slice(0, decimalPos) + '.' + strValue.slice(decimalPos);

  return parseFloat(result).toFixed(decimalPlaces);
}

// Utility function to convert string to bytes32
function stringToBytes32(str) {
  return keccak256(new TextEncoder().encode(str));
}

// Create a new oracle
export async function createOracle(oracleIdString, initialValue, description, signerAddress) {
  const oracleId = stringToBytes32(oracleIdString);
  
  const transaction = {
    to: oracleContractAddress,
    from: signerAddress,
    data: contract.interface.encodeFunctionData('createOracle', [oracleId, initialValue, description]),
  };

  return await Evm.signAndSendTransaction({
    transaction,
    signerAddress,
  });
}

// Check if oracle already exists
export async function checkOracleExists(oracleIdString) {
  const oracleId = stringToBytes32(oracleIdString);
  return await contract.oracleExists(oracleId);
}

// Set oracle error status
export async function setOracleError(oracleIdString, errorStatus, signerAddress) {
  const oracleId = stringToBytes32(oracleIdString);
  
  const transaction = {
    to: oracleContractAddress,
    from: signerAddress,
    data: contract.interface.encodeFunctionData('setOracleError', [oracleId, errorStatus]),
  };

  return await Evm.signAndSendTransaction({
    transaction,
    signerAddress,
  });
}

// Update oracle value
export async function updateOracle(oracleIdString, newValue, signerAddress) {
  const oracleId = stringToBytes32(oracleIdString);
  
  const transaction = {
    to: oracleContractAddress,
    from: signerAddress,
    data: contract.interface.encodeFunctionData('updateOracle', [oracleId, newValue]),
  };

  return await Evm.signAndSendTransaction({
    transaction,
    signerAddress,
  });
}
