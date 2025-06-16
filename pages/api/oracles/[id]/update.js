import { getOracleConfig, updateOracleConfig } from '../../../../utils/oracle-manager.js';
import { updateOracle, signAndBroadcastTransaction, getOracle } from '../../../../utils/theta.js';
import { getDerivationPath } from '../../../../utils/wallet-manager.js';

// ============================================================================
// ORACLE UPDATE API
// ============================================================================

/**
 * API endpoint for manually updating oracle values
 * 
 * This endpoint fetches the latest data from the oracle's configured API,
 * processes it according to the oracle's settings, and updates the value
 * on the blockchain.
 * 
 * POST /api/oracles/[id]/update
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   oldValue?: number,     // Previous oracle value (on success)
 *   newValue?: number,     // New oracle value (on success) 
 *   txHash?: string,       // Transaction hash (on success)
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
    const { id: oracleId } = req.query;

    // ========================================================================
    // VALIDATION AND SETUP
    // ========================================================================

    // Validate oracle ID parameter
    if (!oracleId) {
      return res.status(400).json({
        success: false,
        error: 'Oracle ID is required'
      });
    }

    // Get oracle configuration from local storage
    const oracleConfig = getOracleConfig(oracleId);
    if (!oracleConfig) {
      return res.status(404).json({
        success: false,
        error: 'Oracle not found'
      });
    }

    // Debug: Log the oracle configuration to see what fields are available
    console.log('Oracle config for', oracleId, ':', JSON.stringify(oracleConfig, null, 2));

    // Handle different field names for price multiplier (backward compatibility)
    let priceMultiplier = oracleConfig.priceMultiplier;
    if (priceMultiplier === undefined) {
      // Try alternative field names that might have been used
      priceMultiplier = oracleConfig.multiplier || 10000; // Default to 10000 for higher precision
      console.log('Using fallback priceMultiplier:', priceMultiplier);
      
      // Update the oracle config to include the priceMultiplier field for future use
      try {
        updateOracleConfig(oracleId, { priceMultiplier });
        console.log('Updated oracle config with priceMultiplier field');
      } catch (configError) {
        console.error('Failed to update oracle config with priceMultiplier:', configError);
      }
    }

    // Handle different field names for update interval (backward compatibility)
    let updateInterval = oracleConfig.updateInterval;
    if (updateInterval === undefined) {
      updateInterval = oracleConfig.updateIntervalMinutes || 60; // Default to 60 minutes
      console.log('Using fallback updateInterval:', updateInterval);
      
      // Update the oracle config to include the updateInterval field for future use
      try {
        updateOracleConfig(oracleId, { updateInterval });
        console.log('Updated oracle config with updateInterval field');
      } catch (configError) {
        console.error('Failed to update oracle config with updateInterval:', configError);
      }
    }

    // Get current blockchain value for comparison
    let currentValue;
    try {
      const oracleData = await getOracle(oracleId);
      currentValue = Number(oracleData[0]); // Convert BigInt to number
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Oracle not found on blockchain. It may not have been deployed yet.'
      });
    }

    // ========================================================================
    // DATA FETCHING AND PROCESSING
    // ========================================================================

    // Fetch latest data from API
    let apiData;
    try {
      const response = await fetch(oracleConfig.apiEndpoint);
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      apiData = await response.json();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Failed to fetch data from API: ${error.message}`
      });
    }

    // Extract price value using configured data path
    let rawPrice;
    try {
      rawPrice = extractValueFromPath(apiData, oracleConfig.dataPath);
      console.log('Extracted raw price:', rawPrice, 'from path:', oracleConfig.dataPath);
      console.log('API data sample:', JSON.stringify(apiData, null, 2).substring(0, 500));
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Failed to extract price from API response: ${error.message}`
      });
    }

    // Validate the extracted price
    if (typeof rawPrice !== 'number' || isNaN(rawPrice)) {
      return res.status(400).json({
        success: false,
        error: `Invalid price value extracted: ${rawPrice} (type: ${typeof rawPrice})`
      });
    }

    // Convert to cents using configured multiplier
    const newValue = Math.round(rawPrice * priceMultiplier);
    console.log('Calculated new value:', newValue, '(raw:', rawPrice, '* multiplier:', priceMultiplier, ')');

    // Validate the final value
    if (isNaN(newValue)) {
      return res.status(400).json({
        success: false,
        error: `Invalid final value calculated: ${newValue} from rawPrice: ${rawPrice} * multiplier: ${priceMultiplier}`
      });
    }

    // Check if value has actually changed (avoid unnecessary transactions)
    if (newValue === currentValue) {
      return res.status(200).json({
        success: true,
        message: 'Oracle value unchanged - no update needed',
        oldValue: currentValue,
        newValue: newValue,
        skipped: true
      });
    }

    // ========================================================================
    // BLOCKCHAIN UPDATE
    // ========================================================================

    // Get derivation path for signing
    const derivationPath = getDerivationPath(oracleId);

    // Prepare blockchain transaction
    const { transaction, hashesToSign, senderAddress } = await updateOracle(
      oracleId,
      newValue,
      derivationPath
    );

    // Sign and broadcast the transaction
    const txResult = await signAndBroadcastTransaction(
      transaction,
      hashesToSign,
      derivationPath
    );

    // ========================================================================
    // UPDATE LOCAL CONFIGURATION
    // ========================================================================

    // Update oracle configuration with latest update time
    const now = new Date();
    
    // Ensure updateInterval is valid (fallback to 1 minute if invalid)
    const validUpdateInterval = (updateInterval && !isNaN(updateInterval) && updateInterval > 0) ? updateInterval : 1;
    const nextUpdate = new Date(now.getTime() + validUpdateInterval * 60 * 1000);

    updateOracleConfig(oracleId, {
      lastUpdate: now.toISOString(),
      nextUpdate: nextUpdate.toISOString(),
      hasError: false,
      errorMessage: '',
      lastTxHash: txResult.hash,
      lastValue: newValue
    });

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================

    res.status(200).json({
      success: true,
      message: 'Oracle updated successfully',
      oldValue: currentValue,
      newValue: newValue,
      change: newValue - currentValue,
      txHash: txResult.hash,
      blockNumber: txResult.blockNumber
    });

  } catch (error) {
    console.error('Oracle update error:', error);

    // Update oracle configuration with error status
    try {
      updateOracleConfig(req.query.id, {
        hasError: true,
        errorMessage: error.message,
        lastErrorAt: new Date().toISOString()
      });
    } catch (configError) {
      console.error('Failed to update oracle config with error:', configError);
    }

    // Return error response
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update oracle'
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
  console.log('Extracting path:', path, 'from object keys:', Object.keys(obj));
  
  const keys = path.split('.');
  let value = obj;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`Step ${i + 1}: Looking for key '${key}' in:`, typeof value === 'object' ? Object.keys(value) : value);
    
    if (value === null || value === undefined) {
      throw new Error(`Path not found at step ${i + 1}: '${key}' in path '${path}' - value is ${value}`);
    }
    
    if (typeof value !== 'object') {
      throw new Error(`Path not found at step ${i + 1}: '${key}' in path '${path}' - cannot access property of ${typeof value}`);
    }
    
    value = value[key];
    console.log(`Step ${i + 1} result:`, value, '(type:', typeof value, ')');
  }
  
  if (value === undefined || value === null) {
    throw new Error(`Path '${path}' exists but value is ${value}`);
  }
  
  console.log('Final extracted value:', value, 'type:', typeof value);
  
  // Validate that the extracted value is numeric
  if (typeof value === 'string') {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      throw new Error(`Value at path '${path}' is not a valid number: '${value}'`);
    }
    console.log('Converted string to number:', numericValue);
    return numericValue;
  } else if (typeof value === 'number') {
    if (isNaN(value)) {
      throw new Error(`Value at path '${path}' is NaN`);
    }
    return value;
  } else {
    throw new Error(`Value at path '${path}' is not a number or numeric string (found: ${typeof value}, value: ${value})`);
  }
} 