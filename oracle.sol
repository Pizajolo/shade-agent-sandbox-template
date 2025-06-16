// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleOracle {
    struct OracleData {
        uint256 value;
        uint256 lastUpdateBlock;
        address creator;
        bool exists;
        bool hasError;
        string description;
    }
    
    // Mapping from oracle ID to oracle data
    mapping(bytes32 => OracleData) private oracles;
    
    // Events
    event OracleCreated(bytes32 indexed oracleId, address indexed creator, string description);
    event OracleUpdated(bytes32 indexed oracleId, uint256 newValue, uint256 blockNumber);
    event OracleErrorSet(bytes32 indexed oracleId, bool hasError, uint256 blockNumber);
    
    // Errors
    error OracleNotExists();
    error OnlyCreatorCanUpdate();
    error OracleAlreadyExists();
    
    /**
     * @dev Creates a new oracle endpoint
     * @param oracleId Unique identifier for the oracle
     * @param initialValue Initial value for the oracle
     * @param description Description of what this oracle tracks
     */
    function createOracle(
        bytes32 oracleId,
        uint256 initialValue,
        string calldata description
    ) external {
        if (oracles[oracleId].exists) {
            revert OracleAlreadyExists();
        }
        
        oracles[oracleId] = OracleData({
            value: initialValue,
            lastUpdateBlock: block.number,
            creator: msg.sender,
            exists: true,
            hasError: false,
            description: description
        });
        
        emit OracleCreated(oracleId, msg.sender, description);
    }
    
    /**
     * @dev Updates oracle value - only callable by the oracle creator
     * @param oracleId The oracle identifier to update
     * @param newValue New value for the oracle
     */
    function updateOracle(bytes32 oracleId, uint256 newValue) external {
        OracleData storage oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        if (oracle.creator != msg.sender) {
            revert OnlyCreatorCanUpdate();
        }
        
        oracle.value = newValue;
        oracle.lastUpdateBlock = block.number;
        oracle.hasError = false;
        
        emit OracleUpdated(oracleId, newValue, block.number);
    }
    
    /**
     * @dev Sets error status for oracle - only callable by the oracle creator
     * @param oracleId The oracle identifier to update
     * @param errorStatus True if oracle has error fetching data, false to clear error
     */
    function setOracleError(bytes32 oracleId, bool errorStatus) external {
        OracleData storage oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        if (oracle.creator != msg.sender) {
            revert OnlyCreatorCanUpdate();
        }
        
        oracle.hasError = errorStatus;
        oracle.lastUpdateBlock = block.number;
        
        emit OracleErrorSet(oracleId, errorStatus, block.number);
    }
    
    /**
     * @dev Gets oracle information including value and last update block
     * @param oracleId The oracle identifier to query
     * @return value Current oracle value
     * @return lastUpdateBlock Block number of last update
     * @return creator Address of the oracle creator
     * @return hasError True if oracle has data fetching error
     * @return description Oracle description
     */
    function getOracle(bytes32 oracleId) 
        external 
        view 
        returns (
            uint256 value,
            uint256 lastUpdateBlock,
            address creator,
            bool hasError,
            string memory description
        ) 
    {
        OracleData memory oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        return (
            oracle.value,
            oracle.lastUpdateBlock,
            oracle.creator,
            oracle.hasError,
            oracle.description
        );
    }
    
    /**
     * @dev Gets oracle error status
     * @param oracleId The oracle identifier to query
     * @return hasError True if oracle has data fetching error
     */
    function getOracleErrorStatus(bytes32 oracleId) external view returns (bool hasError) {
        OracleData memory oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        return oracle.hasError;
    }
    
    /**
     * @dev Gets oracle value with error check - reverts if oracle has error
     * @param oracleId The oracle identifier to query
     * @return value Current oracle value
     */
    function getOracleValueSafe(bytes32 oracleId) external view returns (uint256 value) {
        OracleData memory oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        require(!oracle.hasError, "Oracle has data error - value may be stale");
        
        return oracle.value;
    }
    
    /**
     * @dev Checks if an oracle exists
     * @param oracleId The oracle identifier to check
     * @return exists True if oracle exists, false otherwise
     */
    function oracleExists(bytes32 oracleId) external view returns (bool exists) {
        return oracles[oracleId].exists;
    }
    
    /**
     * @dev Gets only the oracle value (lightweight function)
     * @param oracleId The oracle identifier to query
     * @return value Current oracle value
     */
    function getOracleValue(bytes32 oracleId) external view returns (uint256 value) {
        OracleData memory oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        return oracle.value;
    }
    
    /**
     * @dev Gets the creator of an oracle
     * @param oracleId The oracle identifier to query
     * @return creator Address of the oracle creator
     */
    function getOracleCreator(bytes32 oracleId) external view returns (address creator) {
        OracleData memory oracle = oracles[oracleId];
        
        if (!oracle.exists) {
            revert OracleNotExists();
        }
        
        return oracle.creator;
    }
}
