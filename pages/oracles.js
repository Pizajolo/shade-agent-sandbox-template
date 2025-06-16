import { useState, useEffect } from 'react';
import Head from 'next/head';
import OracleWizard from '../components/OracleWizard';
import styles from '../styles/Oracles.module.css';

// ============================================================================
// ORACLE MANAGEMENT DASHBOARD
// ============================================================================

/**
 * Main oracle management page
 * 
 * This page provides a comprehensive dashboard for managing oracles:
 * - View all configured oracles with their current status
 * - Create new oracles using the wizard
 * - Monitor oracle values and update status
 * - Manually trigger oracle updates
 * - Check wallet balances and funding status
 */
export default function Oracles() {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [oracles, setOracles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [updatingOracles, setUpdatingOracles] = useState(new Set());

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  /**
   * Load all oracle configurations and their current blockchain status
   */
  const loadOracles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/oracles/list');
      const data = await response.json();
      
      if (data.success) {
        setOracles(data.oracles || []);
      } else {
        setError(data.error || 'Failed to load oracles');
      }
    } catch (error) {
      console.error('Error loading oracles:', error);
      setError('Failed to load oracles');
    } finally {
      setLoading(false);
    }
  };

  // Load oracles on component mount
  useEffect(() => {
    loadOracles();
  }, []);

  // ========================================================================
  // ORACLE OPERATIONS
  // ========================================================================

  /**
   * Manually trigger an oracle update
   * @param {string} oracleId - ID of the oracle to update
   */
  const updateOracle = async (oracleId) => {
    try {
      // Add to updating set to show loading state
      setUpdatingOracles(prev => new Set([...prev, oracleId]));
      
      const response = await fetch(`/api/oracles/${oracleId}/update`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message immediately
        console.log(`Oracle ${oracleId} updated successfully`);
        
        // Wait for transaction confirmation before refreshing
        if (result.txHash) {
          console.log(`Waiting for transaction ${result.txHash} to be confirmed...`);
          
          // Wait for the transaction to be confirmed on the blockchain
          const waitForConfirmation = async () => {
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 30; // Wait up to 30 seconds
            
            while (!confirmed && attempts < maxAttempts) {
              try {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                
                // Try to fetch updated oracle data to see if the update is reflected
                const checkResponse = await fetch('/api/oracles/list');
                const checkData = await checkResponse.json();
                
                if (checkData.success) {
                  const updatedOracle = checkData.oracles.find(o => o.id === oracleId);
                  if (updatedOracle && updatedOracle.lastUpdateBlock) {
                    // Check if the oracle has been updated recently (within last 5 blocks as a rough estimate)
                    confirmed = true;
                    console.log(`Oracle ${oracleId} update confirmed on blockchain`);
                    await loadOracles(); // Final refresh with confirmed data
                    break;
                  }
                }
                
                attempts++;
              } catch (error) {
                attempts++;
                console.error('Error checking transaction confirmation:', error);
              }
            }
            
            if (!confirmed) {
              console.warn(`Transaction confirmation timeout for ${oracleId}, refreshing anyway`);
              await loadOracles(); // Refresh even if we couldn't confirm
            }
          };
          
          waitForConfirmation();
        } else {
          // No transaction hash provided, just refresh after a short delay
          setTimeout(async () => {
            await loadOracles();
          }, 2000);
        }
        
      } else {
        setError(result.error || 'Failed to update oracle');
      }
    } catch (error) {
      console.error('Error updating oracle:', error);
      setError('Failed to update oracle');
    } finally {
      // Remove from updating set
      setUpdatingOracles(prev => {
        const newSet = new Set(prev);
        newSet.delete(oracleId);
        return newSet;
      });
    }
  };

  /**
   * Handle successful oracle creation from wizard
   * @param {Object} newOracle - The newly created oracle configuration
   */
  const handleOracleCreated = async (newOracle) => {
    setShowWizard(false);
    await loadOracles(); // Refresh the list
  };

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  /**
   * Format timestamp for display
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted date/time
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  /**
   * Get status badge class based on oracle state
   * @param {Object} oracle - Oracle configuration object
   * @returns {string} CSS class name for status badge
   */
  const getStatusClass = (oracle) => {
    if (!oracle.isDeployed) return styles.statusNotDeployed;
    if (oracle.hasError) return styles.statusError;
    return styles.statusActive;
  };

  /**
   * Get status text for display
   * @param {Object} oracle - Oracle configuration object
   * @returns {string} Human-readable status text
   */
  const getStatusText = (oracle) => {
    if (!oracle.isDeployed) return 'Not Deployed';
    if (oracle.hasError) return 'Error';
    return 'Active';
  };

  // ========================================================================
  // RENDER FUNCTIONS
  // ========================================================================

  /**
   * Render individual oracle card
   * @param {Object} oracle - Oracle configuration object
   * @returns {JSX.Element} Oracle card component
   */
  const renderOracleCard = (oracle) => (
    <div key={oracle.id} className={styles.oracleCard}>
      {/* Header with name and status */}
      <div className={styles.cardHeader}>
        <h3>{oracle.name}</h3>
        <span className={`${styles.statusBadge} ${getStatusClass(oracle)}`}>
          {getStatusText(oracle)}
        </span>
      </div>
      
      {/* Description */}
      <p className={styles.description}>{oracle.description}</p>
      
      {/* Current Value Display */}
      {oracle.isDeployed && (
        <div className={styles.currentValue}>
          <h4>Current Value</h4>
          <div className={styles.valueDisplay}>
            {oracle.formattedPrice || 'Loading...'}
          </div>
          {oracle.lastUpdateBlock && (
            <small>Block: {oracle.lastUpdateBlock}</small>
          )}
        </div>
      )}
      
      {/* Configuration Details */}
      <div className={styles.configDetails}>
        <div className={styles.configItem}>
          <strong>API:</strong> {oracle.apiEndpoint}
        </div>
        <div className={styles.configItem}>
          <strong>Data Path:</strong> {oracle.dataPath}
        </div>
        <div className={styles.configItem}>
          <strong>Update Interval:</strong> {oracle.updateInterval} minutes
        </div>
        <div className={styles.configItem}>
          <strong>Wallet Balance:</strong> 
          <span className={`${styles.balanceValue} ${oracle.walletBalance && parseFloat(oracle.walletBalance) < 0.001 ? styles.lowBalance : ''}`}>
            {oracle.walletBalance ? `${oracle.walletBalance} ETH` : 'Loading...'}
          </span>
        </div>
        {oracle.lastUpdate && (
          <div className={styles.configItem}>
            <strong>Last Update:</strong> {formatTimestamp(oracle.lastUpdate)}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className={styles.cardActions}>
        {oracle.isDeployed ? (
          <button
            onClick={() => updateOracle(oracle.id)}
            disabled={updatingOracles.has(oracle.id)}
            className={`${styles.updateButton} ${
              updatingOracles.has(oracle.id) ? styles.updating : ''
            }`}
          >
            {updatingOracles.has(oracle.id) ? 'Updating...' : 'Update Now'}
          </button>
        ) : (
          <span className={styles.notDeployedText}>
            Oracle not deployed to blockchain
          </span>
        )}
      </div>
    </div>
  );

  /**
   * Render empty state when no oracles exist
   */
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <h3>No Oracles Yet</h3>
      <p>Create your first oracle to get started with decentralized price feeds.</p>
      <button 
        onClick={() => setShowWizard(true)}
        className={styles.createButton}
      >
        Create Your First Oracle
      </button>
    </div>
  );

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading oracles...</p>
    </div>
  );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <>
      <Head>
        <title>Oracle Management - Shade Agent</title>
        <meta name="description" content="Manage your decentralized oracles" />
      </Head>

      <div className={styles.container}>
        {/* Page Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Oracle Management</h1>
            <p>Manage your decentralized price oracles on Sepolia testnet</p>
          </div>
          
          {oracles.length > 0 && (
            <button 
              onClick={() => setShowWizard(true)}
              className={styles.createButton}
            >
              + Create Oracle
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorBanner}>
            <strong>Error:</strong> {error}
            <button onClick={() => setError('')} className={styles.dismissError}>×</button>
          </div>
        )}

        {/* Main Content */}
        <div className={styles.content}>
          {loading ? (
            renderLoading()
          ) : oracles.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Oracle Stats */}
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <h3>{oracles.length}</h3>
                  <p>Total Oracles</p>
                </div>
                <div className={styles.statCard}>
                  <h3>{oracles.filter(o => o.isDeployed).length}</h3>
                  <p>Deployed</p>
                </div>
                <div className={styles.statCard}>
                  <h3>{oracles.filter(o => o.isDeployed && !o.hasError).length}</h3>
                  <p>Active</p>
                </div>
              </div>

              {/* Oracle Grid */}
              <div className={styles.oracleGrid}>
                {oracles.map(renderOracleCard)}
              </div>
            </>
          )}
        </div>

        {/* Oracle Creation Wizard */}
        {showWizard && (
          <OracleWizard
            onComplete={handleOracleCreated}
            onCancel={() => setShowWizard(false)}
          />
        )}
      </div>
    </>
  );
} 