// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HerbTraceability
 * @notice HerbOrigin: Blockchain-Based End-to-End Traceability of Ayurvedic Herbs from Source to Shelf
 * @dev Implements role-based tamper-proof provenance for Ayurvedic medicinal herbs.
 */
contract HerbTraceability {
    enum Role { None, Admin, Collector, Processor, LabVerifier, Manufacturer, Consumer }
    enum QualityStatus { Pending, InTesting, Approved, Rejected, Quarantined }

    struct Batch {
        string batchNumber;
        string herbName;
        string botanicalName;
        uint256 quantityKg;
        uint256 collectionTimestamp;
        string collectorName;
        string gpsCoordinates;
        string region;
        QualityStatus quality;
        address registeredBy;
        bool exists;
    }

    struct TraceEvent {
        string eventType;      // COLLECTION, PROCESSING, LAB_TEST, FORMULATION, PACKAGING, DISPATCH
        string description;
        string location;
        uint256 timestamp;
        address actor;
        string evidenceHash;   // IPFS or SHA-256 document hash
    }

    struct LabTestResult {
        uint256 testTimestamp;
        string labName;
        address verifier;
        uint256 moisturePercentScaled; // scaled by 100 (e.g. 850 = 8.50%)
        uint256 pesticidePpmScaled;
        bool heavyMetalsPassed;
        string activeCompound;         // e.g. Withanolides
        uint256 activeCompoundPercentScaled;
        QualityStatus status;
        string certificateHash;
    }

    address public owner;
    mapping(address => Role) public userRoles;
    mapping(string => Batch) public batches;
    mapping(string => TraceEvent[]) public batchEvents;
    mapping(string => LabTestResult) public labTests;
    string[] public registeredBatchNumbers;

    event RoleAssigned(address indexed user, Role role);
    event BatchRegistered(string indexed batchNumber, string herbName, address indexed collector);
    event TraceEventAdded(string indexed batchNumber, string eventType, address indexed actor);
    event LabTestRecorded(string indexed batchNumber, QualityStatus status, address indexed verifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can execute");
        _;
    }

    modifier onlyRole(Role requiredRole) {
        require(
            userRoles[msg.sender] == requiredRole || msg.sender == owner,
            "Caller lacks required role"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        userRoles[msg.sender] = Role.Admin;
    }

    function assignRole(address user, Role role) external onlyOwner {
        require(user != address(0), "Invalid address");
        userRoles[user] = role;
        emit RoleAssigned(user, role);
    }

    function registerBatch(
        string calldata batchNumber,
        string calldata herbName,
        string calldata botanicalName,
        uint256 quantityKg,
        string calldata collectorName,
        string calldata gpsCoordinates,
        string calldata region
    ) external onlyRole(Role.Collector) {
        require(!batches[batchNumber].exists, "Batch already registered");

        batches[batchNumber] = Batch({
            batchNumber: batchNumber,
            herbName: herbName,
            botanicalName: botanicalName,
            quantityKg: quantityKg,
            collectionTimestamp: block.timestamp,
            collectorName: collectorName,
            gpsCoordinates: gpsCoordinates,
            region: region,
            quality: QualityStatus.Pending,
            registeredBy: msg.sender,
            exists: true
        });

        registeredBatchNumbers.push(batchNumber);

        batchEvents[batchNumber].push(TraceEvent({
            eventType: "COLLECTION",
            description: "Herb harvested and tagged at geographical origin",
            location: region,
            timestamp: block.timestamp,
            actor: msg.sender,
            evidenceHash: ""
        }));

        emit BatchRegistered(batchNumber, herbName, msg.sender);
    }

    function addTraceEvent(
        string calldata batchNumber,
        string calldata eventType,
        string calldata description,
        string calldata location,
        string calldata evidenceHash
    ) external {
        require(batches[batchNumber].exists, "Batch does not exist");
        require(userRoles[msg.sender] != Role.None, "Unauthorized user");

        batchEvents[batchNumber].push(TraceEvent({
            eventType: eventType,
            description: description,
            location: location,
            timestamp: block.timestamp,
            actor: msg.sender,
            evidenceHash: evidenceHash
        }));

        emit TraceEventAdded(batchNumber, eventType, msg.sender);
    }

    function recordLabTest(
        string calldata batchNumber,
        string calldata labName,
        uint256 moistureScaled,
        uint256 pesticideScaled,
        bool heavyMetalsPass,
        string calldata activeCompound,
        uint256 activeCompoundScaled,
        QualityStatus status,
        string calldata certHash
    ) external onlyRole(Role.LabVerifier) {
        require(batches[batchNumber].exists, "Batch does not exist");

        labTests[batchNumber] = LabTestResult({
            testTimestamp: block.timestamp,
            labName: labName,
            verifier: msg.sender,
            moisturePercentScaled: moistureScaled,
            pesticidePpmScaled: pesticideScaled,
            heavyMetalsPassed: heavyMetalsPass,
            activeCompound: activeCompound,
            activeCompoundPercentScaled: activeCompoundScaled,
            status: status,
            certificateHash: certHash
        });

        batches[batchNumber].quality = status;

        batchEvents[batchNumber].push(TraceEvent({
            eventType: "LAB_VERIFICATION",
            description: status == QualityStatus.Approved ? "Lab Test Passed Ayurvedic Pharmacopoeia" : "Lab Test Flagged/Rejected",
            location: labName,
            timestamp: block.timestamp,
            actor: msg.sender,
            evidenceHash: certHash
        }));

        emit LabTestRecorded(batchNumber, status, msg.sender);
    }

    function getBatchEvents(string calldata batchNumber) external view returns (TraceEvent[] memory) {
        require(batches[batchNumber].exists, "Batch does not exist");
        return batchEvents[batchNumber];
    }

    function getBatchCount() external view returns (uint256) {
        return registeredBatchNumbers.length;
    }
}
