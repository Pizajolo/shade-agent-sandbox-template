import { getSchedulerStatus, startScheduler, stopScheduler } from '../../../utils/scheduler.js';

// ============================================================================
// SCHEDULER STATUS API
// ============================================================================

/**
 * API endpoint for scheduler management
 * 
 * GET /api/scheduler/status - Get current scheduler status
 * POST /api/scheduler/status - Start/stop scheduler
 * 
 * Body for POST:
 * {
 *   action: 'start' | 'stop'
 * }
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get scheduler status
      const status = getSchedulerStatus();
      
      res.status(200).json({
        success: true,
        scheduler: status,
        timestamp: new Date().toISOString()
      });
      
    } else if (req.method === 'POST') {
      // Control scheduler
      const { action } = req.body;
      
      if (action === 'start') {
        startScheduler();
        res.status(200).json({
          success: true,
          message: 'Scheduler started',
          scheduler: getSchedulerStatus()
        });
      } else if (action === 'stop') {
        stopScheduler();
        res.status(200).json({
          success: true,
          message: 'Scheduler stopped',
          scheduler: getSchedulerStatus()
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid action. Use "start" or "stop"'
        });
      }
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    
  } catch (error) {
    console.error('Error in scheduler status API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
} 