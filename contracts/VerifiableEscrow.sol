// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VerifiableEscrow
 * @notice Autonomous AI Agent Task Verification & Escrow Protocol for 0G Chain.
 * @dev Integrates 0G Storage cryptographic proofs (rootHash) with on-chain settlement.
 */
contract VerifiableEscrow is ReentrancyGuard, Ownable {

    enum BountyStatus { Open, Submitted, Verified, Released, Refunded, Disputed }

    struct Bounty {
        uint256 id;
        address creator;
        address worker;
        uint256 amount;
        uint256 minPassingScore; // Minimum passing score (e.g. 70 out of 100)
        uint256 deadline;
        BountyStatus status;
        string taskSpecURI;     // 0G Storage URI for task description & rubric
        bytes32 taskSpecRoot;   // 0G Storage Merkle root of task spec
        bytes32 proofRoot;      // 0G Storage Merkle root of evaluation proof
        uint256 finalScore;     // AI evaluation score (0-100)
        uint256 createdAt;
        uint256 verifiedAt;
    }

    uint256 public nextBountyId = 1;
    mapping(uint256 => Bounty) public bounties;
    mapping(address => uint256[]) public creatorBounties;
    mapping(address => uint256[]) public workerBounties;

    // Authorized AI Judge / Evaluator oracles
    mapping(address => bool) public authorizedJudges;

    // Events for 0G Explorer indexing and live tracking
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 amount,
        uint256 minPassingScore,
        uint256 deadline,
        bytes32 taskSpecRoot
    );

    event DeliverableSubmitted(
        uint256 indexed bountyId,
        address indexed worker,
        string deliverableURI,
        bytes32 deliverableRoot
    );

    event ProofVerifiedOn0G(
        uint256 indexed bountyId,
        address indexed judge,
        bytes32 proofRoot,
        uint256 score,
        bool passed
    );

    event FundsReleased(
        uint256 indexed bountyId,
        address indexed worker,
        uint256 amount
    );

    event BountyRefunded(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 amount
    );

    event JudgeAuthorized(address indexed judge, bool authorized);

    modifier onlyJudge() {
        require(authorizedJudges[msg.sender] || msg.sender == owner(), "Not authorized AI judge");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedJudges[msg.sender] = true;
    }

    function setJudgeAuthorization(address judge, bool authorized) external onlyOwner {
        authorizedJudges[judge] = authorized;
        emit JudgeAuthorized(judge, authorized);
    }

    /**
     * @notice Creates a new verifiable task bounty with locked escrow.
     */
    function createBounty(
        uint256 minPassingScore,
        uint256 durationSeconds,
        string calldata taskSpecURI,
        bytes32 taskSpecRoot
    ) external payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Bounty reward must be > 0");
        require(minPassingScore <= 100, "Min score must be <= 100");
        require(durationSeconds >= 300, "Min duration is 5 minutes");

        uint256 bountyId = nextBountyId++;
        uint256 deadline = block.timestamp + durationSeconds;

        bounties[bountyId] = Bounty({
            id: bountyId,
            creator: msg.sender,
            worker: address(0),
            amount: msg.value,
            minPassingScore: minPassingScore,
            deadline: deadline,
            status: BountyStatus.Open,
            taskSpecURI: taskSpecURI,
            taskSpecRoot: taskSpecRoot,
            proofRoot: bytes32(0),
            finalScore: 0,
            createdAt: block.timestamp,
            verifiedAt: 0
        });

        creatorBounties[msg.sender].push(bountyId);

        emit BountyCreated(
            bountyId,
            msg.sender,
            msg.value,
            minPassingScore,
            deadline,
            taskSpecRoot
        );

        return bountyId;
    }

    /**
     * @notice Contributor / AI Worker submits a task deliverable.
     */
    function submitDeliverable(
        uint256 bountyId,
        string calldata deliverableURI,
        bytes32 deliverableRoot
    ) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.status == BountyStatus.Open, "Bounty not open for submissions");
        require(block.timestamp <= bounty.deadline, "Bounty deadline passed");
        require(deliverableRoot != bytes32(0), "Invalid deliverable root");

        bounty.worker = msg.sender;
        bounty.status = BountyStatus.Submitted;
        workerBounties[msg.sender].push(bountyId);

        emit DeliverableSubmitted(
            bountyId,
            msg.sender,
            deliverableURI,
            deliverableRoot
        );
    }

    /**
     * @notice 0G Compute / AI Judge posts verified evaluation proof rooted on 0G Storage.
     * @dev Automatically triggers payout release if the score meets or exceeds the threshold.
     */
    function verifyAndRelease(
        uint256 bountyId,
        bytes32 proofRoot,
        uint256 score
    ) external onlyJudge nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.status == BountyStatus.Submitted, "Bounty must be in Submitted state");
        require(proofRoot != bytes32(0), "Invalid 0G storage proof root");
        require(score <= 100, "Score must be <= 100");

        bounty.proofRoot = proofRoot;
        bounty.finalScore = score;
        bounty.verifiedAt = block.timestamp;

        bool passed = score >= bounty.minPassingScore;

        emit ProofVerifiedOn0G(
            bountyId,
            msg.sender,
            proofRoot,
            score,
            passed
        );

        if (passed) {
            bounty.status = BountyStatus.Released;
            uint256 payout = bounty.amount;
            address payable recipient = payable(bounty.worker);
            
            (bool sent, ) = recipient.call{value: payout}("");
            require(sent, "Payout transfer failed");

            emit FundsReleased(bountyId, recipient, payout);
        } else {
            bounty.status = BountyStatus.Disputed;
        }
    }

    /**
     * @notice Creator can reclaim funds if the deadline passed with no valid submission.
     */
    function refundExpiredBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(msg.sender == bounty.creator, "Only creator can request refund");
        require(
            (bounty.status == BountyStatus.Open && block.timestamp > bounty.deadline) ||
            bounty.status == BountyStatus.Disputed,
            "Refund conditions not met"
        );

        bounty.status = BountyStatus.Refunded;
        uint256 refundAmount = bounty.amount;

        (bool sent, ) = payable(bounty.creator).call{value: refundAmount}("");
        require(sent, "Refund transfer failed");

        emit BountyRefunded(bountyId, bounty.creator, refundAmount);
    }

    /**
     * @notice Helper to fetch full bounty details for UI and 0G Inspector.
     */
    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }
}
