import { validateOracleId } from '../../../utils/oracle-manager';
import { deriveWalletAddress, getDerivationPath } from '../../../utils/wallet-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { oracleId } = req.body;

    if (!oracleId) {
      return res.status(400).json({ error: 'Oracle ID is required' });
    }

    // Validate oracle ID format (but don't check if it exists yet)
    if (typeof oracleId !== 'string' || oracleId.length < 3 || oracleId.length > 50) {
      return res.status(400).json({ 
        error: 'Oracle ID must be a string between 3 and 50 characters' 
      });
    }

    if (!/^[a-z0-9-_]+$/.test(oracleId)) {
      return res.status(400).json({ 
        error: 'Oracle ID can only contain lowercase letters, numbers, hyphens, and underscores' 
      });
    }

    // Derive wallet for this oracle ID
    const address = await deriveWalletAddress(oracleId);
    const derivationPath = getDerivationPath(oracleId);

    return res.status(200).json({
      oracleId,
      address,
      derivationPath
    });

  } catch (error) {
    console.error('Error deriving address:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 