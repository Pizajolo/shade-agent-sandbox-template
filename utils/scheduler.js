import { loadOracleConfigs } from './oracle-manager.js';
import { getOracle } from './theta.js';

// ============================================================================
// ORACLE SCHEDULER SYSTEM
// ============================================================================

/**
 * Simple scheduler that automatically updates oracles based on their intervals
 * 
 * This scheduler:
 * - Runs every minute to check for due updates
 * - Uses lastUpdate + updateInterval to determine if update is needed
 * - Calls the update API endpoint for each due oracle
 * - Handles errors gracefully and continues running
 */

let schedulerInterval = null;
let isRunning = false;
let updatingOracles = new Set(); // Track oracles currently being updated

// ============================================================================
// SCHEDULER FUNCTIONS
// ============================================================================

/**
 * Calculate the next update time for an oracle
 * @param {Object} oracle - Oracle configuration
 * @returns {Date|null} Next update time or null if never updated
 */
export function calculateNextUpdate(oracle) {
  if (!oracle.lastUpdate) {
    return new Date(); // Update immediately if never updated
  }
  
  const lastUpdate = new Date(oracle.lastUpdate);
  const intervalMs = (oracle.updateInterval || oracle.updateIntervalMinutes || 60) * 60 * 1000; // Convert minutes to milliseconds
  
  return new Date(lastUpdate.getTime() + intervalMs);
}

/**
 * Get all oracles that are due for an update
 * @returns {Promise<Array>} Array of oracle configs that need updating
 */
export async function getOraclesDueForUpdate() {
  try {
    const configs = loadOracleConfigs();
    const currentTime = new Date();
    const dueOracles = [];
    
    for (const [oracleId, config] of Object.entries(configs)) {
      try {
        // Check if oracle exists on blockchain first
        await getOracle(oracleId);
        
        // Calculate next update time
        const nextUpdate = calculateNextUpdate(config);
        
        if (nextUpdate && currentTime >= nextUpdate) {
          dueOracles.push({
            ...config,
            id: oracleId,
            nextUpdate: nextUpdate.toISOString()
          });
        }
      } catch (error) {
        // Skip oracles that don't exist on blockchain
        console.log(`Skipping oracle ${oracleId} - not deployed or error:`, error.message);
      }
    }
    
    return dueOracles;
  } catch (error) {
    console.error('Error getting oracles due for update:', error);
    return [];
  }
}

/**
 * Execute an oracle update by calling the update API
 * @param {string} oracleId - Oracle ID to update
 * @returns {Promise<boolean>} True if update was successful
 */
export async function executeOracleUpdate(oracleId) {
  // Check if oracle is already being updated
  if (updatingOracles.has(oracleId)) {
    console.log(`[Scheduler] ⏭️ Skipping oracle ${oracleId} - already updating`);
    return false;
  }
  
  try {
    // Mark oracle as being updated
    updatingOracles.add(oracleId);
    console.log(`[Scheduler] 🔄 Updating oracle: ${oracleId}`);
    
    // Call the update API endpoint
    const response = await fetch(`http://localhost:3000/api/oracles/${oracleId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`[Scheduler] ✅ Successfully updated oracle ${oracleId}`);
      return true;
    } else {
      // Handle specific error cases
      if (result.error && result.error.includes('already pending')) {
        console.log(`[Scheduler] ⏳ Oracle ${oracleId} has pending transaction - will retry later`);
      } else if (result.error && result.error.includes('Nonce error')) {
        console.log(`[Scheduler] 🔄 Oracle ${oracleId} nonce issue - may have been processed already`);
      } else {
        console.error(`[Scheduler] ❌ Failed to update oracle ${oracleId}:`, result.error);
      }
      return false;
    }
  } catch (error) {
    console.error(`[Scheduler] ❌ Error updating oracle ${oracleId}:`, error);
    return false;
  } finally {
    // Always remove from updating set when done
    updatingOracles.delete(oracleId);
  }
}

/**
 * Main scheduler loop - checks for due updates every minute
 */
async function schedulerLoop() {
  try {
    console.log('[Scheduler] Checking for oracle updates...');
    
    const dueOracles = await getOraclesDueForUpdate();
    
    if (dueOracles.length === 0) {
      console.log('[Scheduler] No oracles due for update');
      return;
    }
    
    // Filter out oracles that are already being updated
    const availableOracles = dueOracles.filter(oracle => !updatingOracles.has(oracle.id));
    
    if (availableOracles.length === 0) {
      console.log('[Scheduler] All due oracles are already being updated');
      return;
    }
    
    console.log(`[Scheduler] Found ${availableOracles.length} oracle(s) due for update:`, 
      availableOracles.map(o => o.id).join(', '));
    
    // Update each oracle sequentially to avoid overwhelming the system
    for (const oracle of availableOracles) {
      await executeOracleUpdate(oracle.id);
      
      // Longer delay between updates to prevent nonce conflicts
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute instead of 2
    }
    
  } catch (error) {
    console.error('[Scheduler] Error in scheduler loop:', error);
  }
}

// ============================================================================
// SCHEDULER CONTROL
// ============================================================================

/**
 * Start the oracle scheduler
 * Runs every minute to check for due updates
 */
export function startScheduler() {
  if (isRunning) {
    console.log('[Scheduler] Already running');
    return;
  }
  
  console.log('[Scheduler] 🚀 Starting oracle scheduler...');
  isRunning = true;
  
  // Run immediately on start
  schedulerLoop();
  
  // Then run every minute (60 seconds)
  schedulerInterval = setInterval(schedulerLoop, 60 * 1000);
  
  console.log('[Scheduler] ✅ Scheduler started - checking every minute');
}

/**
 * Stop the oracle scheduler
 */
export function stopScheduler() {
  if (!isRunning) {
    console.log('[Scheduler] Not running');
    return;
  }
  
  console.log('[Scheduler] 🛑 Stopping oracle scheduler...');
  
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  
  isRunning = false;
  console.log('[Scheduler] ✅ Scheduler stopped');
}

/**
 * Get scheduler status
 * @returns {Object} Status information
 */
export function getSchedulerStatus() {
  return {
    isRunning,
    intervalId: schedulerInterval ? 'active' : null,
    checkIntervalSeconds: 60,
    currentlyUpdating: Array.from(updatingOracles),
    updatingCount: updatingOracles.size
  };
}

// ============================================================================
// AUTO-START (when module is imported)
// ============================================================================

// Auto-start the scheduler when this module is imported
// This ensures it starts when the Next.js app starts
if (typeof window === 'undefined') { // Only run on server side
  // Small delay to ensure the app is fully initialized
  setTimeout(() => {
    startScheduler();
  }, 5000); // Start after 5 seconds
} 