import { updateOracle, checkOracleExists, signAndBroadcastTransaction, getOracleCreator } from '../../../utils/theta';
import { getOracleAddress, checkMinimumBalance } from '../../../utils/wallet-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { oracleId, newValue } = req.body;

    if (!oracleId || newValue === undefined) {
      return res.status(400).json({ error: 'Oracle ID and new value are required' });
    }

    // Validate that newValue is a number
    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue)) {
      return res.status(400).json({ error: 'New value must be a valid number' });
    }

    // Check if oracle exists on blockchain
    const exists = await checkOracleExists(oracleId);
    if (!exists) {
      return res.status(404).json({ error: 'Oracle does not exist' });
    }

    // Get oracle address and check if it matches the creator
    const address = await getOracleAddress(oracleId);
    
    try {
      const creatorAddress = await getOracleCreator(oracleId);
      console.log('Oracle creator:', creatorAddress);
      console.log('Update sender:', address);
      
      if (creatorAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ 
          error: 'Only the oracle creator can update the oracle',
          creator: creatorAddress,
          sender: address
        });
      }
    } catch (error) {
      console.error('Error getting oracle creator:', error);
      return res.status(400).json({ error: 'Failed to verify oracle creator' });
    }

    // Check wallet balance (minimum 0.001 ETH for gas)
    const balanceCheck = await checkMinimumBalance(address, 0.001);
    if (!balanceCheck.hasMinimum) {
      return res.status(400).json({ 
        error: 'Insufficient balance for gas fees',
        address,
        balance: balanceCheck.balance,
        required: balanceCheck.minAmount,
        shortfall: balanceCheck.shortfall
      });
    }

    // Convert value to cents (multiply by 100) for storage
    const valueInCents = Math.floor(numericValue * 100);
    const derivationPath = oracleId; // Use oracle ID as derivation path
    
    // Prepare the update transaction
    const { transaction, hashesToSign, senderAddress } = await updateOracle(oracleId, valueInCents, derivationPath);
    
    console.log('Transaction:', transaction);
    console.log('Hashes to sign:', hashesToSign);
    console.log('Sender address:', senderAddress);
    
    // Sign and broadcast the transaction
    const txResult = await signAndBroadcastTransaction(transaction, hashesToSign, derivationPath);

    res.status(200).json({
      success: true,
      oracleId,
      newValue: numericValue,
      valueInCents,
      address: senderAddress,
      txHash: txResult.hash
    });

  } catch (error) {
    console.error('Error updating oracle:', error);
    res.status(500).json({ error: error.message });
  }
} 