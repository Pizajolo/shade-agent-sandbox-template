import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const ORACLES_FILE = path.join(DATA_DIR, 'oracles.json');

// ============================================================================
// FILE SYSTEM UTILITIES
// ============================================================================

/**
 * Ensure the data directory exists for storing oracle configurations
 */
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all oracle configurations from JSON file
 * @returns {Object} Oracle configurations keyed by oracle ID
 */
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

/**
 * Save oracle configurations to JSON file with automatic backup
 * @param {Object} configs - Oracle configurations to save
 * @returns {boolean} True if save was successful
 */
export function saveOracleConfigs(configs) {
  try {
    ensureDataDirectory();
    
    // Create backup before saving (safety measure)
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

// ============================================================================
// ORACLE CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Add a new oracle configuration
 * @param {Object} oracleData - Oracle configuration data
 * @returns {boolean} True if oracle was added successfully
 * @throws {Error} If oracle ID already exists
 */
export function addOracleConfig(oracleData) {
  try {
    const configs = loadOracleConfigs();
    
    if (configs[oracleData.name]) {
      throw new Error(`Oracle with ID '${oracleData.name}' already exists`);
    }
    
    // Add metadata and default status fields
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

/**
 * Update an existing oracle configuration
 * @param {string} oracleId - Oracle ID to update
 * @param {Object} updates - Fields to update
 * @returns {boolean} True if update was successful
 * @throws {Error} If oracle doesn't exist
 */
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

/**
 * Get a single oracle configuration
 * @param {string} oracleId - Oracle ID to retrieve
 * @returns {Object|null} Oracle configuration or null if not found
 */
export function getOracleConfig(oracleId) {
  try {
    const configs = loadOracleConfigs();
    return configs[oracleId] || null;
  } catch (error) {
    console.error('Error getting oracle config:', error);
    return null;
  }
}

/**
 * Get all oracle IDs
 * @returns {string[]} Array of oracle IDs
 */
export function getAllOracleIds() {
  try {
    const configs = loadOracleConfigs();
    return Object.keys(configs);
  } catch (error) {
    console.error('Error getting oracle IDs:', error);
    return [];
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate oracle ID format and uniqueness
 * @param {string} oracleId - Oracle ID to validate
 * @returns {Object} {valid: boolean, error?: string}
 */
export function validateOracleId(oracleId) {
  // Check basic format requirements
  if (!oracleId || typeof oracleId !== 'string') {
    return { valid: false, error: 'Oracle ID must be a non-empty string' };
  }
  
  if (oracleId.length < 3 || oracleId.length > 50) {
    return { valid: false, error: 'Oracle ID must be between 3 and 50 characters' };
  }
  
  // Only allow URL-safe characters
  if (!/^[a-z0-9-_]+$/.test(oracleId)) {
    return { valid: false, error: 'Oracle ID can only contain lowercase letters, numbers, hyphens, and underscores' };
  }
  
  // Check uniqueness
  const configs = loadOracleConfigs();
  if (configs[oracleId]) {
    return { valid: false, error: 'Oracle ID already exists' };
  }
  
  return { valid: true };
}

/**
 * Validate API endpoint accessibility and response format
 * @param {string} endpoint - API endpoint URL to validate
 * @returns {Object} {valid: boolean, error?: string, data?: Object}
 */
export async function validateApiEndpoint(endpoint) {
  try {
    if (!endpoint || typeof endpoint !== 'string') {
      return { valid: false, error: 'API endpoint must be a non-empty string' };
    }
    
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      return { valid: false, error: 'API endpoint must start with http:// or https://' };
    }
    
    // Test endpoint accessibility
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

/**
 * Validate data path against actual API response
 * @param {string} endpoint - API endpoint to test against
 * @param {string} dataPath - Dot notation path to extract value
 * @returns {Object} {valid: boolean, error?: string, value?: number}
 */
export async function validateDataPath(endpoint, dataPath) {
  try {
    if (!dataPath || typeof dataPath !== 'string') {
      return { valid: false, error: 'Data path must be a non-empty string' };
    }
    
    // First validate the endpoint
    const endpointValidation = await validateApiEndpoint(endpoint);
    if (!endpointValidation.valid) {
      return endpointValidation;
    }
    
    const data = endpointValidation.data;
    
    // Extract value using dot notation path
    const value = extractValueFromPath(data, dataPath);
    
    if (value === undefined || value === null) {
      return { valid: false, error: `Data path '${dataPath}' not found in API response` };
    }
    
    // Convert to number if it's a string
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract value from nested object using dot notation path
 * @param {Object} obj - Object to extract from
 * @param {string} path - Dot notation path (e.g., "data.price")
 * @returns {*} Extracted value or undefined if path not found
 */
function extractValueFromPath(obj, path) {
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
