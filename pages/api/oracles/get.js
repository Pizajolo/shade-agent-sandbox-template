import { getOracle, convertToDecimal } from '../../../utils/theta';
import { keccak256 } from 'viem';

// Utility function to convert string to bytes32 (same as in theta.js)
function stringToBytes32(str) {
  return keccak256(new TextEncoder().encode(str));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { oracleId } = req.query;

    if (!oracleId) {
      return res.status(400).json({ error: 'Oracle ID is required' });
    }

    // Convert oracle ID string to bytes32
    const oracleIdBytes32 = stringToBytes32(oracleId);

    // Get oracle data from blockchain
    const oracleData = await getOracle(oracleIdBytes32);
    
    // oracleData returns: [value, lastUpdateBlock, creator, hasError, description]
    const [value, lastUpdateBlock, creator, hasError, description] = oracleData;

    // Convert value from wei/bigint to readable format (assuming 2 decimals for price)
    const formattedValue = convertToDecimal(value, 2, 2);

    res.status(200).json({
      success: true,
      oracleId,
      data: {
        value: value.toString(),
        formattedValue: `$${formattedValue}`,
        lastUpdateBlock: lastUpdateBlock.toString(),
        creator,
        hasError,
        description
      }
    });

  } catch (error) {
    console.error('Error getting oracle:', error);
    
    if (error.message.includes('OracleNotExists')) {
      return res.status(404).json({ error: 'Oracle not found' });
    }
    
    res.status(500).json({ error: error.message });
  }
} 