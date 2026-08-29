const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function deploy() {
  const rpcs = [
    'https://rpc-galileo.0g.ai',
    'https://evmrpc-testnet.0g.ai',
    'https://rpc-testnet.0g.ai'
  ];

  const privateKey = process.env.PRIVATE_KEY;
  console.log('Testing 0G RPCs with wallet...');

  for (const rpc of rpcs) {
    try {
      console.log('\n--- Connecting to:', rpc);
      const provider = new ethers.JsonRpcProvider(rpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = await wallet.getAddress();
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();
      console.log('Wallet Address:', address);
      console.log('Network Chain ID:', network.chainId.toString());
      console.log('Balance:', ethers.formatEther(balance), '0G');

      if (balance > 0n) {
        console.log('Deploying VerifiableEscrow contract to 0G Chain...');
        const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/VerifiableEscrow.sol/VerifiableEscrow.json', 'utf8'));
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
        const contract = await factory.deploy();
        const txHash = contract.deploymentTransaction() ? contract.deploymentTransaction().hash : 'N/A';
        console.log('Deployment Tx Sent! Hash:', txHash);
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();
        console.log('DEPLOYMENT SUCCESSFUL!');
        console.log('Contract Address:', contractAddress);
        console.log('0G Explorer Link: https://chainscan-galileo.0g.ai/address/' + contractAddress);

        fs.writeFileSync('./deployment.json', JSON.stringify({
          contractAddress,
          deployer: address,
          network: rpc,
          chainId: network.chainId.toString(),
          txHash,
          deployedAt: new Date().toISOString()
        }, null, 2));

        return;
      } else {
        console.log('Notice: Wallet balance is 0.00 0G. Need testnet tokens from 0G faucet.');
      }
    } catch (e) {
      console.log('RPC error on', rpc, ':', e.message);
    }
  }
}

deploy();
