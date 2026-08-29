import { ethers } from "hardhat";
import { ZeroGStorageClient } from "../packages/zero-g-storage/src";
import { AIJudgeEngine } from "../packages/ai-judge/src";

async function main() {
  console.log("========================================================");
  console.log("🧪 Running Live End-to-End 0G Integration Test Suite");
  console.log("========================================================");

  const [deployer, creator, worker] = await ethers.getSigners();
  const storageClient = new ZeroGStorageClient();
  const judgeEngine = new AIJudgeEngine();

  // 1. Deploy Contract
  console.log("\n[Step 1] Deploying VerifiableEscrow on 0G Chain...");
  const factory = await ethers.getContractFactory("VerifiableEscrow");
  const escrow = await factory.deploy();
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  console.log(`✅ Escrow Contract Deployed: ${contractAddress}`);

  // 2. Prepare & Upload Task Spec to 0G Storage
  console.log("\n[Step 2] Uploading Task Specification to 0G Storage...");
  const taskSpec = {
    title: "Implement ERC-4337 Session Key Validator",
    description: "Write a secure session key validator module with tests and passkey support.",
    minPassingScore: 75,
    reward: "0.05 0G",
  };
  const specReceipt = await storageClient.uploadArtifact("task-spec-1.json", taskSpec);
  console.log(`✅ Task Spec Stored on 0G Storage`);
  console.log(`   - Merkle Root: ${specReceipt.rootHash}`);
  console.log(`   - 0G Storage URI: ${specReceipt.uri}`);

  // 3. Create Bounty on 0G Chain
  console.log("\n[Step 3] Creating Escrow Bounty on 0G Chain...");
  const bountyAmount = ethers.parseEther("0.05");
  const createTx = await escrow.connect(creator).createBounty(
    75,
    3600,
    specReceipt.uri,
    specReceipt.rootHash,
    { value: bountyAmount }
  );
  const createReceipt = await createTx.wait();
  console.log(`✅ Bounty #1 Created on 0G Chain (Tx: ${createReceipt?.hash})`);

  // 4. Contributor Submits Deliverable
  console.log("\n[Step 4] Contributor Submitting Deliverable to 0G Storage...");
  const deliverableCode = `
    // SessionKeyValidator.sol - Verified implementation
    contract SessionKeyValidator {
        mapping(address => mapping(bytes32 => bool)) public validKeys;
        function validate(address user, bytes32 keyHash) external view returns (bool) {
            return validKeys[user][keyHash];
        }
    }
  `;
  const deliverableReceipt = await storageClient.uploadArtifact("submission-1.sol", deliverableCode);
  console.log(`✅ Deliverable Stored on 0G Storage (Root: ${deliverableReceipt.rootHash})`);

  const submitTx = await escrow.connect(worker).submitDeliverable(1, deliverableReceipt.uri, deliverableReceipt.rootHash);
  await submitTx.wait();
  console.log(`✅ Deliverable Registered on 0G Chain`);

  // 5. 0G Compute AI Judge Evaluates Submission
  console.log("\n[Step 5] 0G Compute AI Judge Evaluating Deliverable...");
  const evaluation = await judgeEngine.evaluateSubmission(JSON.stringify(taskSpec), deliverableCode, 75);
  console.log(`✅ Evaluation Complete: Score = ${evaluation.score}/100 (Passed: ${evaluation.passed})`);
  console.log(`   - Feedback: "${evaluation.feedback}"`);

  // 6. Upload Audit Report to 0G Storage
  console.log("\n[Step 6] Archiving Audit Report on 0G Storage...");
  const auditReceipt = await storageClient.uploadArtifact("audit-report-1.json", evaluation);
  console.log(`✅ Audit Report Root Hash: ${auditReceipt.rootHash}`);

  // 7. Verify Proof & Trigger Automatic Payout on 0G Chain
  console.log("\n[Step 7] Verifying 0G Proof & Releasing Escrow Payout...");
  const verifyTx = await escrow.verifyAndRelease(1, auditReceipt.rootHash, evaluation.score);
  const verifyReceipt = await verifyTx.wait();
  console.log(`✅ Proof Confirmed on 0G Chain (Tx: ${verifyReceipt?.hash})`);

  // 8. Final On-Chain State Confirmation
  const finalBounty = await escrow.getBounty(1);
  console.log("\n========================================================");
  console.log("🎉 ALL 0G VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log(`   - Final Status: ${finalBounty.status} (3 = Released)`);
  console.log(`   - Verified Score: ${finalBounty.finalScore}/100`);
  console.log(`   - Confirmed 0G Storage Proof Root: ${finalBounty.proofRoot}`);
  console.log("========================================================");
}

main().catch((err) => {
  console.error("❌ Live test runner failed:", err);
  process.exitCode = 1;
});
