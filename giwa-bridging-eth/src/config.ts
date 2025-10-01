import { defineChain, createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicActionsL1, publicActionsL2, walletActionsL1, walletActionsL2 } from "viem/op-stack";
import { sepolia } from "viem/chains";
import dotenv from 'dotenv';

dotenv.config();

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
export const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as `0x${string}`;
export const account = privateKeyToAccount(PRIVATE_KEY);

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
