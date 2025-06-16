import { loadOracleConfigs } from '../../../utils/oracle-manager';
import { monitorBalances } from '../../../utils/wallet-manager';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const configs = loadOracleConfigs();
    const oracleIds = Object.keys(configs);

    if (oracleIds.length === 0) {
      return res.status(200).json({ oracles: [] });
    }

    // Get balance information for all oracles
    const { balances, errors } = await monitorBalances(oracleIds);

    // Combine config and balance information
    const oracles = oracleIds.map(oracleId => {
      const config = configs[oracleId];
      const balanceInfo = balances.find(b => b.oracleId === oracleId);
      const balanceError = errors.find(e => e.oracleId === oracleId);

      return {
        ...config,
        balance: balanceInfo ? balanceInfo.balance : 0,
        hasMinimumBalance: balanceInfo ? balanceInfo.hasMinimum : false,
        balanceError: balanceError ? balanceError.error : null
      };
    });

    res.status(200).json({ oracles });

  } catch (error) {
    console.error('Error listing oracles:', error);
    res.status(500).json({ error: error.message });
  }
} 