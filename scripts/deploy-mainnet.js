const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }


async function deployMainnet() {
  console.log("====================================================");
  console.log(">> Deploying VeriTask (Escrow0G) to 0G Aristotle Mainnet");
  console.log("====================================================");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: No PRIVATE_KEY found in .env");
    process.exit(1);
  }

  const mainnetRpcs = [
    process.env.ZERO_G_MAINNET_RPC,
    "https://evmrpc.0g.ai",
    "https://rpc.0g.ai",
    "https://0g.drpc.org"
  ].filter(Boolean);

  const artifactPath = path.join(__dirname, "../artifacts/contracts/VerifiableEscrow.sol/VerifiableEscrow.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Compile first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));


  for (const rpc of mainnetRpcs) {
    try {
      console.log("\nTrying 0G Mainnet Endpoint:", rpc);
      const provider = new ethers.JsonRpcProvider(rpc, { chainId: 16661, name: "0g-mainnet" }, { staticNetwork: true });
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = await wallet.getAddress();
      console.log("Wallet Address:", address);

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
      console.log("Broadcasting deployment transaction to 0G Mainnet...");
      const contract = await factory.deploy();
      const txHash = contract.deploymentTransaction() ? contract.deploymentTransaction().hash : "Pending";
      console.log("Tx Broadcasted! Hash:", txHash);

      console.log("Awaiting 0G Mainnet confirmation...");
      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();

      console.log("\n====================================================");
      console.log("🎉 VERITASK DEPLOYED ON 0G MAINNET (16661)!");
      console.log("Contract Address:", contractAddress);
      console.log("Transaction Hash:", txHash);
      console.log("0G Mainnet Explorer: https://chainscan.0g.ai/address/" + contractAddress);
      console.log("====================================================\n");


      fs.writeFileSync(path.join(__dirname, "../deployment-mainnet.json"), JSON.stringify({
        contractAddress,
        deployer: address,
        txHash,
        network: "0G Aristotle Mainnet",
        chainId: "16661",
        rpc,
        deployedAt: new Date().toISOString()
      }, null, 2));

      return;
    } catch (err) {
      console.warn("CONNECTION NOTICE [" + rpc + "]:", err.message);
    }
  }

  console.log("\n[Note]: Please ensure your local DNS resolves evmrpc.0g.ai or provide a private 0G Mainnet validator RPC in ZERO_G_MAINNET_RPC.");
}

deployMainnet();
