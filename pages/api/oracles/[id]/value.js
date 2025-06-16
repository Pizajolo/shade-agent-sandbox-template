import { getOracle } from '../../../../utils/theta';
import { getOracleConfig } from '../../../../utils/oracle-manager';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: oracleId } = req.query;

    if (!oracleId) {
      return res.status(400).json({ error: 'Oracle ID is required' });
    }

    // Get oracle configuration to check if it exists
    const oracleConfig = getOracleConfig(oracleId);
    if (!oracleConfig) {
      return res.status(404).json({ error: 'Oracle not found' });
    }

    // Get oracle data from blockchain
    const oracleData = await getOracle(oracleId);
    const [value, lastUpdateBlock, creator, hasError, description] = oracleData;
    
    // Convert value from cents back to decimal
    const displayValue = (parseInt(value.toString()) / 100).toFixed(2);

    return res.status(200).json({
      oracleId,
      value: parseInt(value.toString()),
      displayValue: displayValue,
      lastUpdateBlock: parseInt(lastUpdateBlock.toString()),
      creator,
      hasError,
      description
    });

  } catch (error) {
    console.error('Error getting oracle value:', error);
    
    // If oracle doesn't exist on blockchain yet, return appropriate response
    if (error.message && error.message.includes('execution reverted')) {
      return res.status(404).json({ 
        error: 'Oracle not yet deployed to blockchain',
        notDeployed: true
      });
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 