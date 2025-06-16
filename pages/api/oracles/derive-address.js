import { getOracleAddress } from '../../../utils/wallet-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { oracleId } = req.body;

    if (!oracleId) {
      return res.status(400).json({ error: 'Oracle ID is required' });
    }

    const address = await getOracleAddress(oracleId);

    res.status(200).json({
      oracleId,
      address
    });

  } catch (error) {
    console.error('Error deriving address:', error);
    res.status(500).json({ error: error.message });
  }
} 