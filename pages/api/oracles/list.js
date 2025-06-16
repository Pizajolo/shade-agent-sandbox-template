import { loadOracleConfigs } from '../../../utils/oracle-manager.js';
import { getOracle, convertToDecimal, getWalletBalanceEthers } from '../../../utils/theta.js';
import { deriveWalletAddress } from '../../../utils/wallet-manager.js';
// Import scheduler to auto-start it
import '../../../utils/scheduler.js';

// ============================================================================
// ORACLE LIST API
// ============================================================================

/**
 * API endpoint for retrieving all oracle configurations and their live data
 * 
 * This endpoint loads oracle configurations from local storage and enriches
 * them with current blockchain data including values and status.
 * 
 * GET /api/oracles/list
 * 
 * Response:
 * {
 *   success: boolean,
 *   oracles: Array<{
 *     // Local configuration
 *     name: string,
 *     description: string,
 *     apiEndpoint: string,
 *     dataPath: string,
 *     updateInterval: number,
 *     // Blockchain data
 *     currentValue?: number,
 *     lastUpdateBlock?: number,
 *     hasError?: boolean,
 *     formattedPrice?: string
 *   }>,
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
    // ========================================================================
    // LOAD ORACLE CONFIGURATIONS
    // ========================================================================

    // Load all oracle configurations from local JSON file
    const configs = loadOracleConfigs();
    
    if (!configs || Object.keys(configs).length === 0) {
      return res.status(200).json({
        success: true,
        oracles: [],
        message: 'No oracles configured'
      });
    }

    // ========================================================================
    // ENRICH WITH BLOCKCHAIN DATA
    // ========================================================================

    // Process each oracle sequentially to avoid batch request limits
    const oracles = [];
    
    for (const [oracleId, config] of Object.entries(configs)) {
      try {
        // Fetch current oracle data from blockchain
        const oracleData = await getOracle(oracleId);
        
        // Extract oracle information
        const [value, lastUpdateBlock, creator, hasError, description] = oracleData;
        
        // Convert BigInt values to serializable numbers
        const currentValue = Number(value);
        const blockNumber = Number(lastUpdateBlock);
        
        // Calculate display values using the oracle's price multiplier
        const multiplier = config.priceMultiplier || 100; // Default to 100 for backward compatibility
        const priceInDollars = currentValue / multiplier;
        const decimalPlaces = multiplier === 10000 ? 4 : 2; // Show 4 decimals for high precision
        const formattedPrice = `$${priceInDollars.toFixed(decimalPlaces)}`;

        // Fetch wallet balance using stored wallet address
        let walletBalance = 'Unknown';
        try {
          const walletAddress = config.walletAddress || config.address;
          if (walletAddress) {
            const balanceWei = await getWalletBalanceEthers(walletAddress);
            walletBalance = convertToDecimal(balanceWei, 18, 6); // Convert to ETH with 6 decimal places
          } else {
            // Fallback to deriving address if not stored
            const derivedAddress = await deriveWalletAddress(oracleId);
            const balanceWei = await getWalletBalanceEthers(derivedAddress);
            walletBalance = convertToDecimal(balanceWei, 18, 6);
          }
        } catch (balanceError) {
          console.error(`Error fetching wallet balance for oracle ${oracleId}:`, balanceError);
          walletBalance = 'Error';
        }

        oracles.push({
          // Basic configuration
          ...config,
          id: oracleId,
          
          // Blockchain data
          currentValue,
          formattedPrice,
          lastUpdateBlock: blockNumber,
          creator,
          hasError,
          blockchainDescription: description,
          walletBalance,
          
          // Status indicators
          isDeployed: true,
          isOnChain: true,
          status: hasError ? 'error' : 'active'
        });
        
      } catch (error) {
        console.error(`Error fetching blockchain data for oracle ${oracleId}:`, error);
        
        // Return oracle config with error status if blockchain call fails
        // Still try to get wallet balance even if oracle isn't deployed
        let walletBalance = 'Unknown';
        try {
          const walletAddress = config.walletAddress || config.address;
          if (walletAddress) {
            const balanceWei = await getWalletBalanceEthers(walletAddress);
            walletBalance = convertToDecimal(balanceWei, 18, 6);
          } else {
            // Fallback to deriving address if not stored
            const derivedAddress = await deriveWalletAddress(oracleId);
            const balanceWei = await getWalletBalanceEthers(derivedAddress);
            walletBalance = convertToDecimal(balanceWei, 18, 6);
          }
        } catch (balanceError) {
          console.error(`Error fetching wallet balance for oracle ${oracleId}:`, balanceError);
          walletBalance = 'Error';
        }

        oracles.push({
          ...config,
          id: oracleId,
          currentValue: null,
          formattedPrice: 'Not Deployed',
          lastUpdateBlock: null,
          hasError: true,
          errorMessage: 'Oracle not found on blockchain',
          walletBalance,
          isDeployed: false,
          isOnChain: false,
          status: 'not_deployed'
        });
      }
    }

    // ========================================================================
    // RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      oracles: oracles,
      count: oracles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error listing oracles:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list oracles',
      oracles: []
    });
  }
} 