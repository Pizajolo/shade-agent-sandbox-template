import { Evm } from './theta';
import { getAgentAccount } from '@neardefi/shade-agent-js';

// Derive oracle wallet from oracle ID
export async function deriveOracleWallet(oracleId) {
  try {
    const { workerAccountId } = await getAgentAccount();
    const derivationPath = oracleId; // Use oracle ID as derivation path
    
    const { address, publicKey } = await Evm.deriveAddressAndPublicKey(
      workerAccountId,
      derivationPath
    );
    
    return {
      address,
      publicKey,
      derivationPath,
      oracleId
    };
  } catch (error) {
    console.error('Error deriving oracle wallet:', error);
    throw error;
  }
}

// Get oracle address from oracle ID
export async function getOracleAddress(oracleId) {
  try {
    const wallet = await deriveOracleWallet(oracleId);
    return wallet.address;
  } catch (error) {
    console.error('Error getting oracle address:', error);
    throw error;
  }
}

// Check wallet balance
export async function checkWalletBalance(address) {
  try {
    const balanceInfo = await Evm.getBalance(address);
    return {
      address,
      balance: balanceInfo.balance,
      decimals: balanceInfo.decimals,
      formatted: formatBalance(balanceInfo.balance, balanceInfo.decimals)
    };
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    throw error;
  }
}

// Format balance for display
function formatBalance(balance, decimals, decimalPlaces = 6) {
  try {
    let strValue = balance.toString();
    
    if (strValue.length <= decimals) {
      strValue = strValue.padStart(decimals + 1, '0');
    }

    const decimalPos = strValue.length - decimals;
    const result = strValue.slice(0, decimalPos) + '.' + strValue.slice(decimalPos);
    
    return parseFloat(result).toFixed(decimalPlaces);
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0.000000';
  }
}

// Check if wallet has minimum balance
export async function checkMinimumBalance(address, minAmount = 0.01) {
  try {
    const balanceInfo = await checkWalletBalance(address);
    const balanceValue = parseFloat(balanceInfo.formatted);
    
    return {
      address,
      balance: balanceValue,
      minAmount,
      hasMinimum: balanceValue >= minAmount,
      shortfall: balanceValue < minAmount ? minAmount - balanceValue : 0
    };
  } catch (error) {
    console.error('Error checking minimum balance:', error);
    throw error;
  }
}

// Wait for wallet to be funded (polling)
export async function waitForFunding(address, minAmount = 5, maxWaitTime = 300000) { // 5 minutes
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const balanceCheck = await checkMinimumBalance(address, minAmount);
        
        if (balanceCheck.hasMinimum) {
          resolve(balanceCheck);
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error(`Timeout waiting for funding. Current balance: ${balanceCheck.balance} TFUEL`));
          return;
        }
        
        setTimeout(poll, pollInterval);
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}

// Monitor balances for multiple oracles
export async function monitorBalances(oracleIds, minAmount = 5) {
  try {
    const results = await Promise.allSettled(
      oracleIds.map(async (oracleId) => {
        const address = await getOracleAddress(oracleId);
        const balanceCheck = await checkMinimumBalance(address, minAmount);
        return {
          oracleId,
          ...balanceCheck
        };
      })
    );
    
    const balances = [];
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        balances.push(result.value);
      } else {
        errors.push({
          oracleId: oracleIds[index],
          error: result.reason.message
        });
      }
    });
    
    return { balances, errors };
  } catch (error) {
    console.error('Error monitoring balances:', error);
    throw error;
  }
}

// Get oracle wallet info (address + balance)
export async function getOracleWalletInfo(oracleId) {
  try {
    const wallet = await deriveOracleWallet(oracleId);
    const balanceInfo = await checkWalletBalance(wallet.address);
    
    return {
      oracleId,
      address: wallet.address,
      balance: balanceInfo.formatted,
      balanceRaw: balanceInfo.balance,
      decimals: balanceInfo.decimals
    };
  } catch (error) {
    console.error('Error getting oracle wallet info:', error);
    throw error;
  }
}
