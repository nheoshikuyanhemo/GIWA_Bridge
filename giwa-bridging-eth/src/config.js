import { defineChain, createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicActionsL1, publicActionsL2, walletActionsL1, walletActionsL2 } from "viem/op-stack";
import { sepolia } from "viem/chains";
import dotenv from 'dotenv';

dotenv.config();

// Validasi private key
if (!process.env.TEST_PRIVATE_KEY) {
    console.error('❌ TEST_PRIVATE_KEY not found in .env file');
    console.error('💡 Please add: TEST_PRIVATE_KEY=your_private_key_here');
    process.exit(1);
}

if (!process.env.TEST_PRIVATE_KEY.startsWith('0x')) {
    console.error('❌ TEST_PRIVATE_KEY must start with 0x');
    process.exit(1);
}

// GIWA Sepolia chain config
export const giwaSepolia = defineChain({
  id: 91342,
  name: 'Giwa Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://sepolia-rpc.giwa.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Giwa Explorer',
      url: 'https://sepolia-explorer.giwa.io',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
    portal: {
      [sepolia.id]: {
        address: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
      },
    },
    l1StandardBridge: {
      [sepolia.id]: {
        address: '0x77b2ffc0F57598cAe1DB76cb398059cF5d10A7E7',
      },
    },
  },
  testnet: true,
});

// Prepare the wallet
export const account = privateKeyToAccount(process.env.TEST_PRIVATE_KEY);

// Clients
export const publicClientL1 = createPublicClient({
  chain: sepolia,
  transport: http(),
}).extend(publicActionsL1());

export const walletClientL1 = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
}).extend(walletActionsL1());

export const publicClientL2 = createPublicClient({
  chain: giwaSepolia,
  transport: http(),
}).extend(publicActionsL2());

export const walletClientL2 = createWalletClient({
  account,
  chain: giwaSepolia,
  transport: http(),
}).extend(walletActionsL2());

console.log('✅ Wallet configured:', account.address);
