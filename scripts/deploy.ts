import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("----------------------------------------------------");
  console.log("🚀 Deploying VeriTask (Escrow0G) to 0G Chain...");
  console.log("----------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} 0G / A0GI`);

  const VerifiableEscrowFactory = await ethers.getContractFactory("VerifiableEscrow");
  const escrow = await VerifiableEscrowFactory.deploy();
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log(`✅ VerifiableEscrow deployed at: ${contractAddress}`);
  console.log(`🔗 0G Explorer: https://chainscan-galileo.0g.ai/address/${contractAddress}`);

  // Save deployment artifact for frontend and verification scripts
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
