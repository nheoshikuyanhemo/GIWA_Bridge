import { publicClientL1, publicClientL2, account, walletClientL1, walletClientL2 } from './config.js';
import { formatEther, parseEther } from "viem";

export async function withdrawETH(amount) {
  try {
    console.log(`🚀 Starting REAL ETH withdrawal: ${amount} ETH`);

    // Check L2 balance
    const l2Balance = await publicClientL2.getBalance({ address: account.address });
    console.log(`💰 L2 Balance: ${formatEther(l2Balance)} ETH`);

    const amountWei = parseEther(amount);
    if (l2Balance < amountWei) {
      throw new Error(`Insufficient L2 balance. Need ${amount} ETH but have ${formatEther(l2Balance)} ETH`);
    }

    console.log('📝 Building withdrawal transaction...');
    
    // Build withdrawal transaction
    const withdrawalArgs = await publicClientL1.buildInitiateWithdrawal({
      to: account.address,
      value: amountWei,
    });

    console.log('🔄 Initiating withdrawal on L2...');
    
    // Initiate withdrawal on L2
    const withdrawalHash = await walletClientL2.initiateWithdrawal(withdrawalArgs);
    console.log(`✅ Withdrawal initiated on L2: ${withdrawalHash}`);

    console.log('⏳ Waiting for L2 confirmation...');
    
    // Wait for L2 confirmation
    const withdrawalReceipt = await publicClientL2.waitForTransactionReceipt({ 
      hash: withdrawalHash,
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✅ L2 transaction confirmed');

    // Check final L2 balance
    const finalL2Balance = await publicClientL2.getBalance({ address: account.address });
    console.log(`💰 Final L2 Balance: ${formatEther(finalL2Balance)} ETH`);

    return {
      success: true,
      withdrawalHash,
      message: `Withdrawal ${amount} ETH initiated successfully! Funds will be available on L1 after the challenge period (approx 7 days). You need to complete the withdrawal process after the challenge period.`
    };
  } catch (error) {
    console.error('❌ Withdrawal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during withdrawal'
    };
  }
}
