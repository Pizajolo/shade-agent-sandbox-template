# Multi-Oracle System Implementation Strategy - Web Interface

## Overview
Build a web-based system to manage multiple oracles through a modern Next.js interface, each with its own wallet, API configuration, and automated update schedule.

## System Architecture

### 1. Data Storage System
**File: `data/oracles.json`**
```json
{
  "oracle-id": {
    "name": "oracle-id",
    "description": "Short description",
    "apiEndpoint": "https://api.example.com/data",
    "dataPath": "data.price", // Simple JSON path (dot notation)
    "updateIntervalMinutes": 60,
    "derivationPath": "oracle-id",
    "address": "0x...", // derived address
    "lastUpdate": "2024-01-01T00:00:00Z",
    "nextUpdate": "2024-01-01T01:00:00Z",
    "isActive": true,
    "hasError": false,
    "errorMessage": "",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Backend API Routes (Next.js API)

#### Phase 1: Core API Endpoints
**File: `pages/api/oracles/`**

**API Endpoints to create:**
- `POST /api/oracles/create` - Create new oracle
- `GET /api/oracles/list` - Get all oracles
- `GET /api/oracles/[id]` - Get specific oracle details
- `PUT /api/oracles/[id]/update` - Manual oracle update
- `GET /api/oracles/[id]/balance` - Check oracle wallet balance
- `PUT /api/oracles/[id]/error` - Set oracle error status
- `DELETE /api/oracles/[id]` - Delete oracle (if needed)

#### Phase 2: Utility API Endpoints
- `POST /api/oracles/validate-api` - Test API endpoint and data path
- `POST /api/oracles/derive-address` - Get address for oracle ID
- `GET /api/oracles/service/status` - Get background service status
- `POST /api/oracles/service/start` - Start background service
- `POST /api/oracles/service/stop` - Stop background service

### 3. Frontend Components (React/Next.js)

#### Phase 3: Main Dashboard Page
**File: `pages/oracles.js`**

**Dashboard Features:**
- List all oracles with status indicators
- Real-time balance monitoring
- Oracle creation wizard
- Quick actions (update, error handling)
- Service status indicator

#### Phase 4: Oracle Creation Wizard
**Component: `components/OracleWizard.js`**

**Wizard Steps:**
1. **Basic Info**: Oracle ID, Description
2. **API Configuration**: Endpoint, Data Path (with live testing)
3. **Update Settings**: Interval in minutes
4. **Wallet Setup**: Show derived address, wait for funding
5. **Confirmation**: Review and create oracle

#### Phase 5: Oracle Management Components
**Components:**
- `components/OracleCard.js` - Individual oracle display
- `components/OracleStatus.js` - Status indicator component
- `components/BalanceMonitor.js` - Balance display with alerts
- `components/ApiTester.js` - Live API endpoint testing
- `components/ServiceController.js` - Start/stop background service

### 4. Updated Implementation Order

#### Sprint 1: Backend Foundation (Days 1-2)
1. **Oracle Management Utilities** (`utils/oracle-manager.js`)
   - `loadOracleConfigs()`, `saveOracleConfigs()`, `addOracleConfig()`
   - `validateOracleId()`, `validateApiEndpoint()`, `validateDataPath()`

2. **Wallet Management** (`utils/wallet-manager.js`)
   - `deriveOracleWallet()`, `getOracleAddress()`, `checkWalletBalance()`
   - `checkMinimumBalance()`, `monitorBalances()`

3. **Basic API Routes**
   - `POST /api/oracles/create`
   - `GET /api/oracles/list`
   - `POST /api/oracles/derive-address`

#### Sprint 2: Oracle Creation Flow (Days 3-4)
1. **Oracle Creation API** (`pages/api/oracles/create.js`)
   - Validate inputs, test API, create oracle, save config

2. **Oracle Creation Wizard** (`components/OracleWizard.js`)
   - Multi-step form with validation
   - Live API testing
   - Address derivation and funding verification

3. **Main Dashboard Page** (`pages/oracles.js`)
   - Basic oracle list display
   - Integration with creation wizard

#### Sprint 3: Data Processing & Updates (Days 5-6)
1. **Data Fetching System** (`utils/data-fetcher.js`)
   - `fetchApiData()`, `extractValueSimple()`, `validateExtractedValue()`

2. **Update API Endpoints**
   - `PUT /api/oracles/[id]/update` - Manual oracle update
   - `GET /api/oracles/[id]/balance` - Balance checking

3. **Oracle Management UI**
   - Oracle cards with status
   - Manual update buttons
   - Balance monitoring

#### Sprint 4: Background Service & Automation (Days 7-8)
1. **Scheduler System** (`utils/scheduler.js`)
   - `calculateNextUpdate()`, `getOraclesDueForUpdate()`, `executeOracleUpdate()`

2. **Background Service** (`oracle-service.js`)
   - Automated update cycle
   - Balance monitoring
   - Error handling

3. **Service Control API & UI**
   - Start/stop service endpoints
   - Service status monitoring
   - Real-time updates via WebSocket or polling

#### Sprint 5: Polish & Monitoring (Days 9-10)
1. **Enhanced UI Components**
   - Real-time status updates
   - Error notifications
   - Balance alerts

2. **Monitoring & Logging**
   - Activity logs
   - Error tracking
   - Performance metrics

### 5. UI/UX Design Strategy

#### Main Dashboard Layout