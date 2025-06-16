import { validateApiEndpoint, validateDataPath } from '../../../utils/oracle-manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiEndpoint, dataPath } = req.body;

    if (!apiEndpoint) {
      return res.status(400).json({ error: 'API endpoint is required' });
    }

    // Validate API endpoint
    const endpointValidation = await validateApiEndpoint(apiEndpoint);
    if (!endpointValidation.valid) {
      return res.status(400).json({ 
        error: endpointValidation.error,
        step: 'endpoint'
      });
    }

    // If data path is provided, validate it too
    if (dataPath) {
      const pathValidation = await validateDataPath(apiEndpoint, dataPath);
      if (!pathValidation.valid) {
        return res.status(400).json({ 
          error: pathValidation.error,
          step: 'dataPath'
        });
      }

      return res.status(200).json({
        valid: true,
        message: 'API endpoint and data path are valid',
        apiData: endpointValidation.data,
        extractedValue: pathValidation.value,
        valueType: typeof pathValidation.value
      });
    }

    // Just endpoint validation
    return res.status(200).json({
      valid: true,
      message: 'API endpoint is valid',
      apiData: endpointValidation.data
    });

  } catch (error) {
    console.error('Error validating API:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
} 