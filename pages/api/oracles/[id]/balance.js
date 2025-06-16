import { getWalletBalance, deriveWalletAddress } from '../../../../utils/wallet-manager.js';
import { convertToDecimal } from '../../../../utils/theta.js';

// ============================================================================
// ORACLE BALANCE API
// ============================================================================

/**
 * API endpoint for checking an oracle's wallet balance
 * 
 * This endpoint retrieves the current ETH balance of an oracle's wallet
 * and returns it in both raw Wei and formatted ETH values.
 * 
 * GET /api/oracles/[id]/balance
 * 
 * Response:
 * {
 *   success: boolean,
 *   oracleId: string,
 *   address: string,
 *   balance: {
 *     raw: string,           // Balance in Wei (as string to avoid BigInt serialization)
 *     eth: string,           // Balance in ETH (formatted)
 *     hasMinimum: boolean    // Whether balance meets 0.001 ETH minimum
 *   },
 *   error?: string
 * }
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { id: oracleId } = req.query;

    // ========================================================================
    // VALIDATION
    // ========================================================================

    // Validate oracle ID parameter
    if (!oracleId) {
      return res.status(400).json({
        success: false,
        error: 'Oracle ID is required'
      });
    }

    // ========================================================================
    // FETCH WALLET DATA
    // ========================================================================

    // Get wallet address for this oracle
    const address = await deriveWalletAddress(oracleId);
    
    // Get current balance in Wei
    const balanceResult = await getWalletBalance(oracleId);
    console.log('Balance result:', balanceResult, 'type:', typeof balanceResult);
    
    // Handle different return types from getWalletBalance
    let balanceWei;
    if (typeof balanceResult === 'bigint') {
      balanceWei = balanceResult;
    } else if (typeof balanceResult === 'object' && balanceResult !== null) {
      // If it's an object, try to extract the balance property
      balanceWei = balanceResult.balance || balanceResult.value || BigInt(0);
    } else {
      balanceWei = BigInt(balanceResult || 0);
    }
    
    console.log('Processed balance Wei:', balanceWei, 'type:', typeof balanceWei);
    
    // Convert to ETH for display (18 decimals, show 6 decimal places)
    const balanceEth = convertToDecimal(balanceWei, 18, 6);
    
    // Check if balance meets minimum requirement (0.001 ETH)
    const minimumBalance = BigInt('100000000000000'); // 0.001 ETH in Wei
    const hasMinimum = balanceWei >= minimumBalance;

    // ========================================================================
    // RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      oracleId,
      address,
      balance: {
        raw: balanceWei.toString(), // Convert BigInt to string for JSON serialization
        eth: balanceEth,
        hasMinimum
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting oracle balance:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get oracle balance'
    });
  }
} 