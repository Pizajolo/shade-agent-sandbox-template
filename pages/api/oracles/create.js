import { 
  validateOracleId, 
  validateApiEndpoint, 
  validateDataPath, 
  addOracleConfig 
} from '../../../utils/oracle-manager';
import { getOracleAddress, checkMinimumBalance } from '../../../utils/wallet-manager';
import { createOracle, checkOracleExists, signAndBroadcastTransaction } from '../../../utils/theta';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      oracleId, 
      description, 
      apiEndpoint, 
      dataPath, 
      updateIntervalMinutes, 
      initialValue 
    } = req.body;

    // Validate input
    if (!oracleId || !description || !apiEndpoint || !dataPath || !updateIntervalMinutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate oracle ID
    const idValidation = validateOracleId(oracleId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    // Validate API endpoint and data path
    const endpointValidation = await validateApiEndpoint(apiEndpoint);
    if (!endpointValidation.valid) {
      return res.status(400).json({ error: endpointValidation.error });
    }

    const pathValidation = await validateDataPath(apiEndpoint, dataPath);
    if (!pathValidation.valid) {
      return res.status(400).json({ error: pathValidation.error });
    }

    // Get oracle address
    const address = await getOracleAddress(oracleId);

    // Check if oracle already exists on blockchain
    const exists = await checkOracleExists(oracleId);
    if (exists) {
      return res.status(400).json({ error: 'Oracle already exists on blockchain' });
    }

    // Check wallet balance
    const balanceCheck = await checkMinimumBalance(address, 5);
    if (!balanceCheck.hasMinimum) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        address,
        balance: balanceCheck.balance,
        required: balanceCheck.minAmount,
        shortfall: balanceCheck.shortfall
      });
    }

    // Create oracle on blockchain
    const useInitialValue = initialValue !== undefined ? initialValue : Math.floor(pathValidation.value * 100); // Convert to cents
    const derivationPath = oracleId; // Use oracle ID as derivation path
    
    // Prepare the transaction
    const { transaction, hashesToSign, senderAddress } = await createOracle(oracleId, useInitialValue, description, derivationPath);
    
    // Sign and broadcast the transaction
    const txResult = await signAndBroadcastTransaction(transaction, hashesToSign, derivationPath);

    // Save configuration
    const oracleConfig = {
      name: oracleId,
      description,
      apiEndpoint,
      dataPath,
      updateIntervalMinutes: parseInt(updateIntervalMinutes),
      derivationPath: oracleId,
      address: senderAddress,
      isActive: true,
      hasError: false
    };

    addOracleConfig(oracleConfig);

    res.status(200).json({
      success: true,
      oracleId,
      address: senderAddress,
      txHash: txResult.hash,
      config: oracleConfig
    });

  } catch (error) {
    console.error('Error creating oracle:', error);
    res.status(500).json({ error: error.message });
  }
} 