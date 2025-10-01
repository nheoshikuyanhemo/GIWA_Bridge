import { publicClientL1, publicClientL2, account, walletClientL1 } from './config.js';
import { formatEther, parseEther } from "viem";
import { getL2TransactionHashes } from "viem/op-stack";

export async function depositETH(amount) {
  try {
    console.log(`🚀 Starting REAL ETH deposit: ${amount} ETH`);

    // Check L1 balance
    const l1Balance = await publicClientL1.getBalance({ address: account.address });
    console.log(`💰 L1 Balance: ${formatEther(l1Balance)} ETH`);

    const amountWei = parseEther(amount);
    if (l1Balance < amountWei) {
      throw new Error(`Insufficient L1 balance. Need ${amount} ETH but have ${formatEther(l1Balance)} ETH`);
    }

    console.log('📝 Building deposit transaction...');
    
    // Build deposit transaction
    const depositArgs = await publicClientL2.buildDepositTransaction({
      mint: amountWei,
      to: account.address,
    });

    console.log('🔄 Sending deposit transaction to L1...');
    
    // Send deposit transaction
    const depositHash = await walletClientL1.depositTransaction(depositArgs);
    console.log(`✅ Deposit transaction sent on L1: ${depositHash}`);

    console.log('⏳ Waiting for L1 confirmation...');
    
    // Wait for L1 confirmation
    const depositReceipt = await publicClientL1.waitForTransactionReceipt({ 
      hash: depositHash,
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✅ L1 transaction confirmed');

    // Get L2 transaction hash
    const [l2Hash] = getL2TransactionHashes(depositReceipt);
    console.log(`🔗 Corresponding L2 transaction hash: ${l2Hash}`);

    console.log('⏳ Waiting for L2 confirmation...');
    
    // Wait for L2 confirmation
    const l2Receipt = await publicClientL2.waitForTransactionReceipt({ 
      hash: l2Hash,
      timeout: 180000 // 3 minutes timeout
    });
    console.log('✅ L2 transaction confirmed');

    // Check final balances
    const finalL1Balance = await publicClientL1.getBalance({ address: account.address });
    const finalL2Balance = await publicClientL2.getBalance({ address: account.address });
    
    console.log(`💰 Final L1 Balance: ${formatEther(finalL1Balance)} ETH`);
    console.log(`💰 Final L2 Balance: ${formatEther(finalL2Balance)} ETH`);

    return {
      success: true,
      l1Hash: depositHash,
      l2Hash: l2Hash,
      message: `Deposit ${amount} ETH completed successfully! Bridged from Ethereum to GIWA.`
    };
  } catch (error) {
    console.error('❌ Deposit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during deposit'
    };
  }
}
