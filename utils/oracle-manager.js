import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORACLES_FILE = path.join(DATA_DIR, 'oracles.json');

// Ensure data directory exists
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load oracle configurations from JSON file
export function loadOracleConfigs() {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(ORACLES_FILE)) {
      return {};
    }
    
    const data = fs.readFileSync(ORACLES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading oracle configs:', error);
    return {};
  }
}

// Save oracle configurations to JSON file
export function saveOracleConfigs(configs) {
  try {
    ensureDataDirectory();
    
    // Create backup before saving
    if (fs.existsSync(ORACLES_FILE)) {
      const backupFile = `${ORACLES_FILE}.backup.${Date.now()}`;
      fs.copyFileSync(ORACLES_FILE, backupFile);
    }
    
    fs.writeFileSync(ORACLES_FILE, JSON.stringify(configs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving oracle configs:', error);
    return false;
  }
}

// Add new oracle configuration
export function addOracleConfig(oracleData) {
  try {
    const configs = loadOracleConfigs();
    
    if (configs[oracleData.name]) {
      throw new Error(`Oracle with ID '${oracleData.name}' already exists`);
    }
    
    configs[oracleData.name] = {
      ...oracleData,
      createdAt: new Date().toISOString(),
      lastUpdate: null,
      nextUpdate: null,
      isActive: false,
      hasError: false,
      errorMessage: ''
    };
    
    return saveOracleConfigs(configs);
  } catch (error) {
    console.error('Error adding oracle config:', error);
    throw error;
  }
}

// Update existing oracle configuration
export function updateOracleConfig(oracleId, updates) {
  try {
    const configs = loadOracleConfigs();
    
    if (!configs[oracleId]) {
      throw new Error(`Oracle with ID '${oracleId}' not found`);
    }
    
    configs[oracleId] = {
      ...configs[oracleId],
      ...updates
    };
    
    return saveOracleConfigs(configs);
  } catch (error) {
    console.error('Error updating oracle config:', error);
    throw error;
  }
}

// Get single oracle configuration
export function getOracleConfig(oracleId) {
  try {
    const configs = loadOracleConfigs();
    return configs[oracleId] || null;
  } catch (error) {
    console.error('Error getting oracle config:', error);
    return null;
  }
}

// Validate oracle ID
export function validateOracleId(oracleId) {
  if (!oracleId || typeof oracleId !== 'string') {
    return { valid: false, error: 'Oracle ID must be a non-empty string' };
  }
  
  if (oracleId.length < 3 || oracleId.length > 50) {
    return { valid: false, error: 'Oracle ID must be between 3 and 50 characters' };
  }
  
  if (!/^[a-z0-9-_]+$/.test(oracleId)) {
    return { valid: false, error: 'Oracle ID can only contain lowercase letters, numbers, hyphens, and underscores' };
  }
  
  const configs = loadOracleConfigs();
  if (configs[oracleId]) {
    return { valid: false, error: 'Oracle ID already exists' };
  }
  
  return { valid: true };
}

// Validate API endpoint
export async function validateApiEndpoint(endpoint) {
  try {
    if (!endpoint || typeof endpoint !== 'string') {
      return { valid: false, error: 'API endpoint must be a non-empty string' };
    }
    
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      return { valid: false, error: 'API endpoint must start with http:// or https://' };
    }
    
    // Test the endpoint
    const response = await fetch(endpoint, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 5000 
    });
    
    if (!response.ok) {
      return { valid: false, error: `API endpoint returned status ${response.status}` };
    }
    
    const data = await response.json();
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: `Failed to connect to API endpoint: ${error.message}` };
  }
}

// Validate data path with actual API data
export async function validateDataPath(endpoint, dataPath) {
  try {
    if (!dataPath || typeof dataPath !== 'string') {
      return { valid: false, error: 'Data path must be a non-empty string' };
    }
    
    // Validate endpoint first
    const endpointValidation = await validateApiEndpoint(endpoint);
    if (!endpointValidation.valid) {
      return endpointValidation;
    }
    
    const data = endpointValidation.data;
    
    // Extract value using simple dot notation
    const value = extractValueFromPath(data, dataPath);
    
    if (value === undefined || value === null) {
      return { valid: false, error: `Data path '${dataPath}' not found in API response` };
    }
    
    // Handle string numbers (common with APIs)
    let numericValue = value;
    if (typeof value === 'string') {
      numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        return { valid: false, error: `Data path '${dataPath}' contains invalid number: '${value}'` };
      }
    } else if (typeof value !== 'number') {
      return { valid: false, error: `Data path '${dataPath}' does not point to a number or numeric string (found: ${typeof value})` };
    }
    
    return { valid: true, value: numericValue };
  } catch (error) {
    return { valid: false, error: `Failed to validate data path: ${error.message}` };
  }
}

// Extract value from object using simple dot notation
function extractValueFromPath(obj, path) {
    console.log(obj, path);
  try {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }
    
    return value;
  } catch (error) {
    return undefined;
  }
}

// Get all oracle IDs
export function getAllOracleIds() {
  try {
    const configs = loadOracleConfigs();
    return Object.keys(configs);
  } catch (error) {
    console.error('Error getting oracle IDs:', error);
    return [];
  }
}
