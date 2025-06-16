import { Evm } from './theta.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

// MPC contract configuration for Shade Agent wallet operations
const contractId = process.env.NEXT_PUBLIC_contractId || `v1.signer-prod.testnet`;

// ============================================================================
// WALLET OPERATIONS
// ============================================================================

/**
 * Generate a deterministic wallet address from an oracle ID
 * This ensures each oracle has a unique but reproducible wallet address
 * @param {string} oracleId - Oracle identifier (e.g., "eth-price")
 * @returns {Promise<string>} Ethereum wallet address
 */
export async function deriveWalletAddress(oracleId) {
  try {
    const derivationPath = oracleId; // Use oracle ID directly as derivation path
    const { address } = await Evm.deriveAddressAndPublicKey(
      contractId,
      derivationPath
    );
    return address;
  } catch (error) {
    console.error('Error deriving wallet address:', error);
    throw new Error(`Failed to derive wallet address for oracle ${oracleId}`);
  }
}

/**
 * Get the current ETH balance of an oracle's wallet
 * @param {string} oracleId - Oracle identifier
 * @returns {Promise<BigInt>} Wallet balance in Wei (1 ETH = 10^18 Wei)
 */
export async function getWalletBalance(oracleId) {
  try {
    const address = await deriveWalletAddress(oracleId);
    const balance = await Evm.getBalance(address);
    return balance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error(`Failed to get wallet balance for oracle ${oracleId}`);
  }
}

/**
 * Generate the derivation path for an oracle's wallet
 * This path is used by Shade Agent to derive private keys
 * @param {string} oracleId - Oracle identifier
 * @returns {string} Derivation path (just the oracle ID)
 */
export function getDerivationPath(oracleId) {
  return oracleId; // Use oracle ID directly as derivation path
}

/**
 * Check if an oracle's wallet has sufficient balance for operations
 * Minimum balance required is 0.001 ETH to cover gas costs
 * @param {string} oracleId - Oracle identifier
 * @returns {Promise<boolean>} True if wallet has sufficient balance
 */
export async function checkSufficientBalance(oracleId) {
  try {
    const balance = await getWalletBalance(oracleId);
    // 0.001 ETH = 10^16 Wei (minimum required balance)
    const minimumBalance = BigInt('100000000000000');
    return balance >= minimumBalance;
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return false;
  }
}

/**
 * Get wallet information for an oracle including address and balance
 * @param {string} oracleId - Oracle identifier
 * @returns {Promise<Object>} Wallet info: {address, balance, hasSufficientBalance}
 */
export async function getWalletInfo(oracleId) {
  try {
    const address = await deriveWalletAddress(oracleId);
    const balance = await getWalletBalance(oracleId);
    const hasSufficientBalance = await checkSufficientBalance(oracleId);
    
    return {
      address,
      balance,
      hasSufficientBalance
    };
  } catch (error) {
    console.error('Error getting wallet info:', error);
    throw new Error(`Failed to get wallet info for oracle ${oracleId}`);
  }
}





