import { publicClientL1, publicClientL2, account, walletClientL1, walletClientL2 } from './config.js';
import { formatEther, parseEther } from "viem";

export async function withdrawETH(amount: string) {
  try {
    console.log(`Starting ETH withdrawal: ${amount} ETH`);

    // Check L2 balance
    const l2Balance = await publicClientL2.getBalance({ address: account.address });
    console.log(`L2 Balance: ${formatEther(l2Balance)} ETH`);

    if (l2Balance < parseEther(amount)) {
      throw new Error('Insufficient L2 balance');
    }

    // Build withdrawal transaction
    const withdrawalArgs = await publicClientL1.buildInitiateWithdrawal({
      to: account.address,
      value: parseEther(amount),
    });

    // Initiate withdrawal on L2
    const withdrawalHash = await walletClientL2.initiateWithdrawal(withdrawalArgs);
    console.log(`Withdrawal transaction hash on L2: ${withdrawalHash}`);

    // Wait for L2 confirmation
    const withdrawalReceipt = await publicClientL2.waitForTransactionReceipt({ hash: withdrawalHash });
    console.log('L2 transaction confirmed');

    return {
      success: true,
      withdrawalHash,
      message: 'Withdrawal initiated! Please wait for the challenge period to complete the withdrawal.'
    };
  } catch (error) {
    console.error('Withdrawal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const amount = process.argv[2] || "0.00005";
  withdrawETH(amount).then(console.log);
}
