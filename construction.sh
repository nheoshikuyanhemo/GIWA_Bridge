#!/bin/bash
# Script otomatis membuat folder dan file untuk project giwa-bridging-eth

# Buat direktori utama dan masuk ke dalamnya
mkdir -p giwa-bridging-eth/src/web
cd giwa-bridging-eth

# Buat file konfigurasi
cat > package.json << 'EOF'
{
  "name": "giwa-bridging-eth",
  "version": "1.0.0",
  "description": "DApp for bridging ETH between Ethereum and GIWA",
  "type": "module",
  "scripts": {
    "dev": "node --import=tsx src/web/server.js",
    "deposit": "node --import=tsx src/deposit_eth.ts",
    "withdraw": "node --import=tsx src/withdraw_eth.ts",
    "build": "tsc"
  },
  "dependencies": {
    "viem": "^2.0.0",
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "typescript": "^5.0.0"
  }
}
EOF

# Buat file environment
cat > .env << 'EOF'
TEST_PRIVATE_KEY=your_private_key_here
PORT=3000
EOF

# Buat file TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Buat file config.ts
cat > src/config.ts << 'EOF'
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
EOF

# Buat file deposit_eth.ts
cat > src/deposit_eth.ts << 'EOF'
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
EOF

# Buat file withdraw_eth.ts
cat > src/withdraw_eth.ts << 'EOF'
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
EOF

# Buat file index.html
cat > src/web/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GIWA ETH Bridge</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>GIWA ETH Bridge</h1>
            <p>Bridge ETH between Ethereum Sepolia and GIWA Sepolia</p>
        </header>

        <div class="wallet-info">
            <h3>Wallet Information</h3>
            <div id="walletAddress">Address: Loading...</div>
            <div class="balances">
                <div id="l1Balance">L1 Balance: Loading...</div>
                <div id="l2Balance">L2 Balance: Loading...</div>
            </div>
        </div>

        <div class="bridge-interface">
            <div class="bridge-card">
                <h3>Deposit ETH (L1 → L2)</h3>
                <div class="input-group">
                    <input type="number" id="depositAmount" placeholder="0.0" step="0.001" min="0.001">
                    <span>ETH</span>
                </div>
                <button id="depositBtn" onclick="bridge.depositETH()">Deposit ETH</button>
                <div id="depositStatus" class="status"></div>
            </div>

            <div class="bridge-card">
                <h3>Withdraw ETH (L2 → L1)</h3>
                <div class="input-group">
                    <input type="number" id="withdrawAmount" placeholder="0.0" step="0.001" min="0.001">
                    <span>ETH</span>
                </div>
                <button id="withdrawBtn" onclick="bridge.withdrawETH()">Withdraw ETH</button>
                <div id="withdrawStatus" class="status"></div>
            </div>
        </div>

        <div class="transaction-history">
            <h3>Recent Transactions</h3>
            <div id="transactionList"></div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
EOF

# Buat file styles.css
cat > src/web/styles.css << 'EOF'
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
}

header {
    text-align: center;
    margin-bottom: 40px;
    color: white;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.wallet-info {
    background: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.balances {
    display: flex;
    gap: 20px;
    margin-top: 10px;
}

.bridge-interface {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 30px;
}

.bridge-card {
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.bridge-card h3 {
    margin-bottom: 20px;
    color: #333;
}

.input-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}

.input-group input {
    flex: 1;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
}

.input-group span {
    font-weight: bold;
    color: #666;
}

button {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover {
    transform: translateY(-2px);
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.status {
    margin-top: 15px;
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
}

.status.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.status.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.transaction-history {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

#transactionList {
    margin-top: 10px;
}

.transaction-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.transaction-item:last-child {
    border-bottom: none;
}

@media (max-width: 768px) {
    .bridge-interface {
        grid-template-columns: 1fr;
    }
    
    .balances {
        flex-direction: column;
        gap: 10px;
    }
}
EOF

# Buat file app.js
cat > src/web/app.js << 'EOF'
class GiwaBridge {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.init();
    }

    async init() {
        await this.loadWalletInfo();
        this.setupEventListeners();
    }

    async loadWalletInfo() {
        try {
            const response = await fetch(`${this.baseURL}/wallet-info`);
            const data = await response.json();
            
            document.getElementById('walletAddress').textContent = `Address: ${data.address}`;
            document.getElementById('l1Balance').textContent = `L1 Balance: ${data.l1Balance} ETH`;
            document.getElementById('l2Balance').textContent = `L2 Balance: ${data.l2Balance} ETH`;
        } catch (error) {
            console.error('Error loading wallet info:', error);
        }
    }

    setupEventListeners() {
        // Input validation
        const depositInput = document.getElementById('depositAmount');
        const withdrawInput = document.getElementById('withdrawAmount');

        depositInput.addEventListener('input', () => this.validateInput(depositInput));
        withdrawInput.addEventListener('input', () => this.validateInput(withdrawInput));
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        if (value < 0.001) {
            input.style.borderColor = 'red';
        } else {
            input.style.borderColor = '#ddd';
        }
    }

    async depositETH() {
        const amount = document.getElementById('depositAmount').value;
        const button = document.getElementById('depositBtn');
        const status = document.getElementById('depositStatus');

        if (!amount || parseFloat(amount) < 0.001) {
            this.showStatus(status, 'Please enter a valid amount (min 0.001 ETH)', 'error');
            return;
        }

        button.disabled = true;
        button.textContent = 'Depositing...';
        this.showStatus(status, 'Processing deposit...', 'info');

        try {
            const response = await fetch(`${this.baseURL}/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(status, 
                    `Deposit successful! L1 Hash: ${result.l1Hash}`, 
                    'success'
                );
                this.addTransaction('deposit', amount, result.l1Hash);
            } else {
                this.showStatus(status, `Deposit failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(status, `Deposit error: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Deposit ETH';
            await this.loadWalletInfo();
        }
    }

    async withdrawETH() {
        const amount = document.getElementById('withdrawAmount').value;
        const button = document.getElementById('withdrawBtn');
        const status = document.getElementById('withdrawStatus');

        if (!amount || parseFloat(amount) < 0.001) {
            this.showStatus(status, 'Please enter a valid amount (min 0.001 ETH)', 'error');
            return;
        }

        button.disabled = true;
        button.textContent = 'Withdrawing...';
        this.showStatus(status, 'Processing withdrawal...', 'info');

        try {
            const response = await fetch(`${this.baseURL}/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(status, 
                    `Withdrawal initiated! Transaction Hash: ${result.withdrawalHash}`, 
                    'success'
                );
                this.addTransaction('withdraw', amount, result.withdrawalHash);
            } else {
                this.showStatus(status, `Withdrawal failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(status, `Withdrawal error: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Withdraw ETH';
            await this.loadWalletInfo();
        }
    }

    showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status ${type}`;
    }

    addTransaction(type, amount, hash) {
        const transactionList = document.getElementById('transactionList');
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const typeText = type === 'deposit' ? 'Deposit to L2' : 'Withdraw to L1';
        const shortHash = hash.substring(0, 10) + '...' + hash.substring(hash.length - 8);
        
        transactionItem.innerHTML = `
            <span>${typeText} - ${amount} ETH</span>
            <span>${shortHash}</span>
        `;
        
        transactionList.insertBefore(transactionItem, transactionList.firstChild);
    }
}

// Initialize the bridge when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.bridge = new GiwaBridge();
});
EOF

# Buat file server.js
cat > src/web/server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { depositETH } from '../deposit_eth.js';
import { withdrawETH } from '../withdraw_eth.js';
import { publicClientL1, publicClientL2, account } from '../config.js';
import { formatEther } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/wallet-info', async (req, res) => {
    try {
        const [l1Balance, l2Balance] = await Promise.all([
            publicClientL1.getBalance({ address: account.address }),
            publicClientL2.getBalance({ address: account.address })
        ]);

        res.json({
            address: account.address,
            l1Balance: formatEther(l1Balance),
            l2Balance: formatEther(l2Balance)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/deposit', async (req, res) => {
    try {
        const { amount } = req.body;
        const result = await depositETH(amount);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/withdraw', async (req, res) => {
    try {
        const { amount } = req.body;
        const result = await withdrawETH(amount);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`GIWA Bridge DApp running on http://localhost:${PORT}`);
});
EOF

echo "Struktur folder dan file berhasil dibuat!"
echo "Selanjutnya jalankan perintah:"
echo "cd giwa-bridging-eth"
echo "pnpm install"
echo "Edit file .env dan masukkan private key Anda"
echo "pnpm dev"
