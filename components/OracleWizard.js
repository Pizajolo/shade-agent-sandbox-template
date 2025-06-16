import { useState, useEffect } from 'react';
import styles from '../styles/OracleWizard.module.css';

const STEPS = {
  BASIC_INFO: 1,
  API_CONFIG: 2,
  UPDATE_SETTINGS: 3,
  WALLET_SETUP: 4,
  CONFIRMATION: 5
};

// ============================================================================
// ORACLE CREATION WIZARD COMPONENT
// ============================================================================

/**
 * Multi-step wizard for creating new oracles
 * 
 * This component guides users through the oracle creation process:
 * 1. Basic Information - Oracle ID, description
 * 2. API Configuration - Endpoint, data path, multiplier
 * 3. Update Settings - Frequency configuration
 * 4. Wallet Setup - Address derivation and funding check
 * 5. Confirmation - Review and deploy
 */
export default function OracleWizard({ onComplete, onCancel }) {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [currentStep, setCurrentStep] = useState(STEPS.BASIC_INFO);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    apiEndpoint: '',
    dataPath: '',
    updateIntervalMinutes: 60
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiValidation, setApiValidation] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [fundingCheck, setFundingCheck] = useState(null);
  const [checkingFunding, setCheckingFunding] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case STEPS.BASIC_INFO:
        if (!formData.name.trim()) {
          newErrors.name = 'Oracle ID is required';
        } else if (!formData.name.match(/^[a-z0-9-_]+$/)) {
          newErrors.name = 'Oracle ID can only contain lowercase letters, numbers, hyphens, and underscores';
        } else if (formData.name.length < 3 || formData.name.length > 50) {
          newErrors.name = 'Oracle ID must be between 3 and 50 characters';
        }
        
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        } else if (formData.description.length > 200) {
          newErrors.description = 'Description must be less than 200 characters';
        }
        break;

      case STEPS.API_CONFIG:
        if (!formData.apiEndpoint.trim()) {
          newErrors.apiEndpoint = 'API endpoint is required';
        }
        if (!formData.dataPath.trim()) {
          newErrors.dataPath = 'Data path is required';
        }
        if (!apiValidation || !apiValidation.valid) {
          newErrors.api = 'Please test and validate your API configuration';
        }
        break;

      case STEPS.UPDATE_SETTINGS:
        if (!formData.updateIntervalMinutes || formData.updateIntervalMinutes < 1) {
          newErrors.updateIntervalMinutes = 'Update interval must be at least 1 minute';
        } else if (formData.updateIntervalMinutes > 10080) {
          newErrors.updateIntervalMinutes = 'Update interval cannot exceed 1 week (10080 minutes)';
        }
        break;

      case STEPS.WALLET_SETUP:
        if (!walletInfo) {
          newErrors.wallet = 'Wallet address not generated';
        } else if (!fundingCheck || !fundingCheck.isFunded) {
          newErrors.funding = 'Wallet must be funded with at least 0.001 ETH before proceeding';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const testApiConfiguration = async () => {
    if (!formData.apiEndpoint.trim()) {
      setErrors(prev => ({ ...prev, apiEndpoint: 'API endpoint is required' }));
      return;
    }

    setLoading(true);
    setApiValidation(null);

    try {
      const response = await fetch('/api/oracles/validate-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiEndpoint: formData.apiEndpoint,
          dataPath: formData.dataPath
        })
      });

      const result = await response.json();

      if (response.ok) {
        setApiValidation(result);
        setErrors(prev => ({ ...prev, api: null }));
      } else {
        setErrors(prev => ({ ...prev, api: result.error || 'API validation failed' }));
        setApiValidation(null);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, api: 'Failed to test API configuration' }));
      setApiValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const generateWalletAddress = async () => {
    if (!formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Oracle ID is required to generate wallet' }));
      return;
    }

    setLoading(true);
    setWalletInfo(null);

    try {
      const response = await fetch('/api/oracles/derive-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oracleId: formData.name })
      });

      const result = await response.json();

      if (response.ok) {
        setWalletInfo(result);
        setErrors(prev => ({ ...prev, wallet: null }));
      } else {
        setErrors(prev => ({ ...prev, wallet: result.error || 'Failed to generate wallet address' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, wallet: 'Failed to generate wallet address' }));
    } finally {
      setLoading(false);
    }
  };

  const checkWalletFunding = async () => {
    if (!walletInfo) return;

    setCheckingFunding(true);
    try {
      const response = await fetch(`/api/oracles/${formData.name}/balance`);
      const result = await response.json();

      if (response.ok) {
        setFundingCheck({
          balance: result.balance.eth, // Extract the ETH formatted value
          isFunded: result.balance.hasMinimum // Use the hasMinimum flag from API
        });
      } else {
        console.error('Failed to check wallet balance:', result.error);
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error);
    } finally {
      setCheckingFunding(false);
    }
  };

  const createOracle = async () => {
    setLoading(true);

    try {
      // Prepare the data with correct field names for the API
      const oracleData = {
        name: formData.name,
        description: formData.description,
        apiEndpoint: formData.apiEndpoint,
        dataPath: formData.dataPath,
        updateInterval: formData.updateIntervalMinutes, // Map to correct field name
        priceMultiplier: 10000 // Higher precision multiplier (4 decimal places)
      };

      const response = await fetch('/api/oracles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oracleData)
      });

      const result = await response.json();

      if (response.ok) {
        onComplete(result.oracle);
      } else {
        if (result.needsFunding) {
          setErrors(prev => ({ 
            ...prev, 
            create: `${result.error}. Please fund the wallet with at least ${result.required} ETH.` 
          }));
        } else {
          setErrors(prev => ({ ...prev, create: result.error || 'Failed to create oracle' }));
        }
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, create: 'Failed to create oracle' }));
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate wallet when moving to wallet setup step
  useEffect(() => {
    if (currentStep === STEPS.WALLET_SETUP && !walletInfo && formData.name) {
      generateWalletAddress();
    }
  }, [currentStep, formData.name]);

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.BASIC_INFO:
        return (
          <div className={styles.step}>
            <h3>Basic Information</h3>
            <div className={styles.field}>
              <label htmlFor="name">Oracle ID</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value.toLowerCase())}
                placeholder="e.g., btc-price, eth-usd"
                className={errors.name ? styles.error : ''}
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              <small>Use lowercase letters, numbers, hyphens, and underscores only</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Brief description of what this oracle tracks"
                maxLength={200}
                className={errors.description ? styles.error : ''}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
              <small>{formData.description.length}/200 characters</small>
            </div>
          </div>
        );

      case STEPS.API_CONFIG:
        return (
          <div className={styles.step}>
            <h3>API Configuration</h3>
            <div className={styles.field}>
              <label htmlFor="apiEndpoint">API Endpoint</label>
              <input
                id="apiEndpoint"
                type="url"
                value={formData.apiEndpoint}
                onChange={(e) => updateFormData('apiEndpoint', e.target.value)}
                placeholder="https://api.example.com/data"
                className={errors.apiEndpoint ? styles.error : ''}
              />
              {errors.apiEndpoint && <span className={styles.errorText}>{errors.apiEndpoint}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="dataPath">Data Path</label>
              <input
                id="dataPath"
                type="text"
                value={formData.dataPath}
                onChange={(e) => updateFormData('dataPath', e.target.value)}
                placeholder="e.g., data.price or result.usd"
                className={errors.dataPath ? styles.error : ''}
              />
              {errors.dataPath && <span className={styles.errorText}>{errors.dataPath}</span>}
              <small>Use dot notation to navigate JSON structure</small>
            </div>

            <button
              type="button"
              onClick={testApiConfiguration}
              disabled={loading || !formData.apiEndpoint || !formData.dataPath}
              className={styles.testButton}
            >
              {loading ? 'Testing...' : 'Test API Configuration'}
            </button>

            {errors.api && <div className={styles.errorText}>{errors.api}</div>}

            {apiValidation && (
              <div className={styles.apiResult}>
                <h4>✅ API Test Successful</h4>
                <p><strong>Extracted Value:</strong> {apiValidation.extractedValue}</p>
                <p><strong>Value Type:</strong> {apiValidation.valueType}</p>
                <details>
                  <summary>View API Response</summary>
                  <pre>{JSON.stringify(apiValidation.apiData, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        );

      case STEPS.UPDATE_SETTINGS:
        return (
          <div className={styles.step}>
            <h3>Update Settings</h3>
            <div className={styles.field}>
              <label htmlFor="updateIntervalMinutes">Update Interval (minutes)</label>
              <input
                id="updateIntervalMinutes"
                type="number"
                min="1"
                max="10080"
                value={formData.updateIntervalMinutes}
                onChange={(e) => updateFormData('updateIntervalMinutes', parseInt(e.target.value) || 0)}
                className={errors.updateIntervalMinutes ? styles.error : ''}
              />
              {errors.updateIntervalMinutes && <span className={styles.errorText}>{errors.updateIntervalMinutes}</span>}
              <small>
                How often should this oracle update? (1 minute to 1 week)
                <br />
                Current setting: Every {formData.updateIntervalMinutes} minute{formData.updateIntervalMinutes !== 1 ? 's' : ''}
                {formData.updateIntervalMinutes >= 60 && ` (${Math.floor(formData.updateIntervalMinutes / 60)}h ${formData.updateIntervalMinutes % 60}m)`}
              </small>
            </div>
          </div>
        );

      case STEPS.WALLET_SETUP:
        return (
          <div className={styles.step}>
            <h3>Wallet Setup</h3>
            {walletInfo ? (
              <div className={styles.walletInfo}>
                <h4>Generated Wallet Address</h4>
                <div className={styles.addressBox}>
                  <code>{walletInfo.address}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(walletInfo.address)}
                    className={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
                
                <div className={styles.fundingInstructions}>
                  <p><strong>⚠️ Important:</strong> This wallet needs to be funded with ETH tokens to operate.</p>
                  <p>Send at least <strong>0.001 ETH</strong> to this address to cover deployment and transaction fees.</p>
                  <a
                    href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Get Sepolia ETH from faucet →
                  </a>
                </div>

                <div className={styles.fundingCheck}>
                  <button
                    type="button"
                    onClick={checkWalletFunding}
                    disabled={checkingFunding}
                    className={styles.testButton}
                  >
                    {checkingFunding ? 'Checking...' : 'Check Wallet Funding'}
                  </button>
                  
                  {fundingCheck && (
                    <div className={`${styles.fundingResult} ${fundingCheck.isFunded ? styles.funded : styles.needsFunding}`}>
                      <p><strong>Balance:</strong> {fundingCheck.balance} ETH</p>
                      <p><strong>Status:</strong> {fundingCheck.isFunded ? '✅ Funded (Ready to deploy)' : '❌ Needs more funding'}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.loading}>
                <p>Generating wallet address...</p>
              </div>
            )}
            {errors.wallet && <div className={styles.errorText}>{errors.wallet}</div>}
            {errors.funding && <div className={styles.errorText}>{errors.funding}</div>}
          </div>
        );

      case STEPS.CONFIRMATION:
        return (
          <div className={styles.step}>
            <h3>Confirm Oracle Creation</h3>
            <div className={styles.summary}>
              <h4>Oracle Summary</h4>
              <div className={styles.summaryItem}>
                <strong>Oracle ID:</strong> {formData.name}
              </div>
              <div className={styles.summaryItem}>
                <strong>Description:</strong> {formData.description}
              </div>
              <div className={styles.summaryItem}>
                <strong>API Endpoint:</strong> {formData.apiEndpoint}
              </div>
              <div className={styles.summaryItem}>
                <strong>Data Path:</strong> {formData.dataPath}
              </div>
              <div className={styles.summaryItem}>
                <strong>Update Interval:</strong> Every {formData.updateIntervalMinutes} minute{formData.updateIntervalMinutes !== 1 ? 's' : ''}
              </div>
              {walletInfo && (
                <div className={styles.summaryItem}>
                  <strong>Wallet Address:</strong> {walletInfo.address}
                </div>
              )}
              {apiValidation && (
                <div className={styles.summaryItem}>
                  <strong>Test Value:</strong> {apiValidation.extractedValue}
                </div>
              )}
            </div>
            {errors.create && <div className={styles.errorText}>{errors.create}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.wizard}>
        <div className={styles.header}>
          <h2>Create New Oracle</h2>
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${(currentStep / Object.keys(STEPS).length) * 100}%` }}
              />
            </div>
            <span>Step {currentStep} of {Object.keys(STEPS).length}</span>
          </div>
        </div>

        <div className={styles.content}>
          {renderStep()}
        </div>

        <div className={styles.actions}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className={styles.backButton}
            >
              Back
            </button>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={styles.cancelButton}
          >
            Cancel
          </button>

          {currentStep < Object.keys(STEPS).length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={styles.nextButton}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={createOracle}
              disabled={loading}
              className={styles.createButton}
            >
              {loading ? 'Creating...' : 'Create Oracle'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 