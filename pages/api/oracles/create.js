import { addOracleConfig } from '../../../utils/oracle-manager.js';
import { createOracle, signAndBroadcastTransaction, checkOracleExists, getOracle } from '../../../utils/theta.js';
import { getWalletBalance, getDerivationPath } from '../../../utils/wallet-manager.js';

// ============================================================================
// ORACLE CREATION API
// ============================================================================

/**
 * API endpoint for creating new oracles
 * 
 * This endpoint handles both the local configuration storage and blockchain
 * deployment of new oracles. It validates the oracle data, checks wallet
 * funding, and deploys the oracle contract.
 * 
 * POST /api/oracles/create
 * 
 * Request body:
 * {
 *   name: string,           // Oracle ID (e.g., "eth-price")
 *   description: string,    // Human-readable description
 *   apiEndpoint: string,    // API URL to fetch data from
 *   dataPath: string,       // JSON path to price value
 *   updateInterval: number, // Update frequency in minutes
 *   priceMultiplier: number // Multiplier to convert to cents
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   oracle?: Object,       // Oracle configuration (on success)
 *   address?: string,      // Wallet address (on success)
 *   error?: string         // Error message (on failure)
 * }
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { name, description, apiEndpoint, dataPath, updateInterval, priceMultiplier } = req.body;

    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================

    // Validate required fields
    if (!name || !description || !apiEndpoint || !dataPath || !updateInterval || !priceMultiplier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, apiEndpoint, dataPath, updateInterval, priceMultiplier'
      });
    }

    // Validate oracle ID format
    if (!/^[a-z0-9-_]+$/.test(name)) {
      return res.status(400).json({
        success: false,
        error: 'Oracle name must contain only lowercase letters, numbers, hyphens, and underscores'
      });
    }

    // Check if oracle already exists on blockchain
    try {
      const oracleExists = await checkOracleExists(name);
      if (oracleExists) {
        return res.status(400).json({
          success: false,
          error: `Oracle '${name}' already exists on the blockchain. Please choose a different name.`
        });
      }
    } catch (error) {
      console.log(`Could not check if oracle exists (proceeding anyway): ${error.message}`);
      // Continue with creation - the existence check might fail but creation might still work
    }

    // ========================================================================
    // BLOCKCHAIN OPERATIONS
    // ========================================================================

    // Get derivation path for wallet operations
    const derivationPath = getDerivationPath(name);
    
    // Check wallet balance before attempting deployment
    const balance = await getWalletBalance(name);
    const minimumBalance = BigInt('10000000000000000'); // 0.01 ETH in Wei
    
    if (balance < minimumBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient wallet balance. Please fund the oracle wallet with at least 0.01 ETH before creating the oracle.'
      });
    }

    // Fetch initial price from API for contract initialization
    let initialPrice;
    try {
      const response = await fetch(apiEndpoint);
      const data = await response.json();
      const rawPrice = extractValueFromPath(data, dataPath);
      initialPrice = Math.round(rawPrice * priceMultiplier); // Convert to cents
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Failed to fetch initial price from API: ${error.message}`
      });
    }

    // Prepare blockchain transaction for oracle creation
    let transaction, hashesToSign, senderAddress;
    try {
      const result = await createOracle(
        name,
        initialPrice,
        description,
        derivationPath
      );
      transaction = result.transaction;
      hashesToSign = result.hashesToSign;
      senderAddress = result.senderAddress;
    } catch (error) {
      console.error('Error preparing oracle creation transaction:', error);
      
      // Check for specific error types
      if (error.message && error.message.includes('execution reverted')) {
        return res.status(400).json({
          success: false,
          error: `Oracle '${name}' may already exist on the blockchain, or there's a contract validation error. Please try a different oracle name.`
        });
      }
      
      throw error; // Re-throw if it's not a known error
    }

    // Sign and broadcast the transaction
    const txResult = await signAndBroadcastTransaction(
      transaction,
      hashesToSign,
      derivationPath
    );

    // ========================================================================
    // WAIT FOR TRANSACTION CONFIRMATION
    // ========================================================================

    // Wait for the oracle to be available on the blockchain before proceeding
    console.log(`Waiting for oracle '${name}' to be confirmed on blockchain...`);
    
    let oracleConfirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 30 attempts (about 30 seconds)
    
    while (!oracleConfirmed && attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        await getOracle(name); // Try to fetch the oracle
        oracleConfirmed = true;
        console.log(`Oracle '${name}' confirmed on blockchain after ${attempts + 1} attempts`);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn(`Oracle '${name}' not confirmed after ${maxAttempts} attempts, proceeding anyway`);
          break;
        }
        // Continue waiting if oracle not found yet
      }
    }

    // ========================================================================
    // LOCAL CONFIGURATION STORAGE
    // ========================================================================

    // Prepare oracle configuration for local storage
    const oracleData = {
      name,
      description,
      apiEndpoint,
      dataPath,
      updateInterval,
      priceMultiplier,
      walletAddress: senderAddress,
      derivationPath,
      initialPrice,
      deploymentTxHash: txResult.hash,
      deploymentBlock: txResult.blockNumber,
      isActive: true,
      lastUpdate: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + updateInterval * 60 * 1000).toISOString()
    };

    // Save oracle configuration to local JSON file
    addOracleConfig(oracleData);

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================

    res.status(201).json({
      success: true,
      message: 'Oracle created and deployed successfully',
      oracle: oracleData,
      address: senderAddress,
      txHash: txResult.hash,
      blockNumber: txResult.blockNumber
    });

  } catch (error) {
    console.error('Oracle creation error:', error);
    
    // Return appropriate error response
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create oracle'
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract value from nested object using dot notation path
 * @param {Object} obj - Object to extract value from
 * @param {string} path - Dot notation path (e.g., "data.price")
 * @returns {*} Extracted value or throws error if path not found
 */
function extractValueFromPath(obj, path) {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      throw new Error(`Path not found: ${path}`);
    }
    value = value[key];
  }
  
  if (value === undefined || value === null) {
    throw new Error(`Path not found: ${path}`);
  }
  
  return value;
} 