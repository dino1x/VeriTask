import { expect } from "chai";
import { ethers } from "hardhat";
import { VerifiableEscrow } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("VerifiableEscrow (0G Protocol Integration Tests)", function () {
  let escrow: VerifiableEscrow;
  let owner: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let worker: HardhatEthersSigner;
  let judge: HardhatEthersSigner;

  const sampleSpecURI = "0g://storage/testnet/bounty-1-spec.json";
  const sampleSpecRoot = ethers.keccak256(ethers.toUtf8Bytes("Task Spec Content Merkle Root"));
  const sampleDeliverableURI = "0g://storage/testnet/submission-1.json";
  const sampleDeliverableRoot = ethers.keccak256(ethers.toUtf8Bytes("Deliverable Payload Merkle Root"));
  const sampleProofRoot = ethers.keccak256(ethers.toUtf8Bytes("0G AI Evaluation Audit Report Digest"));

  beforeEach(async function () {
    [owner, creator, worker, judge] = await ethers.getSigners();

    const VerifiableEscrowFactory = await ethers.getContractFactory("VerifiableEscrow");
    escrow = await VerifiableEscrowFactory.deploy();
    await escrow.waitForDeployment();

    // Authorize judge
    await escrow.setJudgeAuthorization(judge.address, true);
  });

  it("Should create a bounty and lock escrow funds", async function () {
    const depositAmount = ethers.parseEther("0.1");
    const minScore = 75;
    const duration = 3600; // 1 hour

    const tx = await escrow.connect(creator).createBounty(
      minScore,
      duration,
      sampleSpecURI,
      sampleSpecRoot,
      { value: depositAmount }
    );

    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);

    const bounty = await escrow.getBounty(1);
    expect(bounty.creator).to.equal(creator.address);
    expect(bounty.amount).to.equal(depositAmount);
    expect(bounty.minPassingScore).to.equal(minScore);
    expect(bounty.status).to.equal(0); // BountyStatus.Open
  });

  it("Should accept deliverable submission from worker", async function () {
    const depositAmount = ethers.parseEther("0.1");
    await escrow.connect(creator).createBounty(80, 3600, sampleSpecURI, sampleSpecRoot, { value: depositAmount });

    await expect(
      escrow.connect(worker).submitDeliverable(1, sampleDeliverableURI, sampleDeliverableRoot)
    )
      .to.emit(escrow, "DeliverableSubmitted")
      .withArgs(1, worker.address, sampleDeliverableURI, sampleDeliverableRoot);

    const bounty = await escrow.getBounty(1);
    expect(bounty.worker).to.equal(worker.address);
    expect(bounty.status).to.equal(1); // BountyStatus.Submitted
  });

  it("Should verify 0G proof and release payout automatically on passing grade", async function () {
    const depositAmount = ethers.parseEther("0.1");
    await escrow.connect(creator).createBounty(70, 3600, sampleSpecURI, sampleSpecRoot, { value: depositAmount });
    await escrow.connect(worker).submitDeliverable(1, sampleDeliverableURI, sampleDeliverableRoot);

    const initialWorkerBalance = await ethers.provider.getBalance(worker.address);

    const passingScore = 88;
    const verifyTx = await escrow.connect(judge).verifyAndRelease(1, sampleProofRoot, passingScore);
    await verifyTx.wait();

    const bounty = await escrow.getBounty(1);
    expect(bounty.status).to.equal(3); // BountyStatus.Released
    expect(bounty.finalScore).to.equal(passingScore);
    expect(bounty.proofRoot).to.equal(sampleProofRoot);

    const finalWorkerBalance = await ethers.provider.getBalance(worker.address);
    expect(finalWorkerBalance - initialWorkerBalance).to.equal(depositAmount);
  });

  it("Should flag bounty as Disputed if score does not meet minimum threshold", async function () {
    const depositAmount = ethers.parseEther("0.1");
    await escrow.connect(creator).createBounty(80, 3600, sampleSpecURI, sampleSpecRoot, { value: depositAmount });
    await escrow.connect(worker).submitDeliverable(1, sampleDeliverableURI, sampleDeliverableRoot);

    const failingScore = 55;
    await escrow.connect(judge).verifyAndRelease(1, sampleProofRoot, failingScore);

    const bounty = await escrow.getBounty(1);
    expect(bounty.status).to.equal(5); // BountyStatus.Disputed
    expect(bounty.finalScore).to.equal(failingScore);
  });
});
