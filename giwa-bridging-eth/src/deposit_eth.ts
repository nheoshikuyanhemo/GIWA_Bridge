import { publicClientL1, publicClientL2, account, walletClientL1 } from './config.js';
import { formatEther, parseEther } from "viem";
import { getL2TransactionHashes } from "viem/op-stack";

export async function depositETH(amount: string) {
  try {
    console.log(`Starting ETH deposit: ${amount} ETH`);

    // Check L1 balance
    const l1Balance = await publicClientL1.getBalance({ address: account.address });
    console.log(`L1 Balance: ${formatEther(l1Balance)} ETH`);

    if (l1Balance < parseEther(amount)) {
      throw new Error('Insufficient L1 balance');
    }

    // Build deposit transaction
    const depositArgs = await publicClientL2.buildDepositTransaction({
      mint: parseEther(amount),
      to: account.address,
    });

    // Send deposit transaction
    const depositHash = await walletClientL1.depositTransaction(depositArgs);
    console.log(`Deposit transaction hash on L1: ${depositHash}`);

    // Wait for L1 confirmation
    const depositReceipt = await publicClientL1.waitForTransactionReceipt({ hash: depositHash });
    console.log('L1 transaction confirmed');

    // Get L2 transaction hash
    const [l2Hash] = getL2TransactionHashes(depositReceipt);
    console.log(`Corresponding L2 transaction hash: ${l2Hash}`);

    // Wait for L2 confirmation
    const l2Receipt = await publicClientL2.waitForTransactionReceipt({ hash: l2Hash });
    console.log('L2 transaction confirmed');

    return {
      success: true,
      l1Hash: depositHash,
      l2Hash: l2Hash,
      message: 'Deposit completed successfully!'
    };
  } catch (error) {
    console.error('Deposit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const amount = process.argv[2] || "0.001";
  depositETH(amount).then(console.log);
}
