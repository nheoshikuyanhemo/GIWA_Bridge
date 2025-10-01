import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/web')));

// Import config dan functions
import { account, publicClientL1, publicClientL2, walletClientL1, walletClientL2 } from './src/config.js';
import { depositETH } from './src/deposit_eth.js';
import { withdrawETH } from './src/withdraw_eth.js';
import { formatEther } from 'viem';

console.log('🔧 Initializing GIWA Bridge DApp...');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/web/index.html'));
});

app.get('/api/wallet-info', async (req, res) => {
    try {
        if (!account) {
            return res.json({
                address: '0xWalletNotConfigured',
                l1Balance: '0.0000',
                l2Balance: '0.0000',
                error: 'Wallet not configured. Set TEST_PRIVATE_KEY in .env'
            });
        }

        const [l1Balance, l2Balance] = await Promise.all([
            publicClientL1.getBalance({ address: account.address }),
            publicClientL2.getBalance({ address: account.address })
        ]);

        res.json({
            address: account.address,
            l1Balance: parseFloat(formatEther(l1Balance)).toFixed(4),
            l2Balance: parseFloat(formatEther(l2Balance)).toFixed(4)
        });
    } catch (error) {
        console.error('Error getting wallet info:', error);
        res.json({
            address: account?.address || '0xError',
            l1Balance: '0.0000',
            l2Balance: '0.0000',
            error: error.message
        });
    }
});

app.post('/api/deposit', async (req, res) => {
    const { amount } = req.body;
    
    if (!amount || parseFloat(amount) < 0.001) {
        return res.json({
            success: false,
            error: 'Please enter a valid amount (min 0.001 ETH)'
        });
    }

    if (!account) {
        return res.json({
            success: false,
            error: 'Wallet not configured. Set TEST_PRIVATE_KEY in .env file'
        });
    }

    try {
        console.log(`🔄 Processing REAL deposit: ${amount} ETH from ${account.address}`);
        
        const result = await depositETH(amount);
        
        if (result.success) {
            res.json({
                success: true,
                message: `Deposit ${amount} ETH completed successfully!`,
                l1Hash: result.l1Hash,
                l2Hash: result.l2Hash,
                l1ExplorerUrl: `https://sepolia.etherscan.io/tx/${result.l1Hash}`,
                l2ExplorerUrl: `https://sepolia-explorer.giwa.io/tx/${result.l2Hash}`
            });
        } else {
            res.json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Deposit error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/withdraw', async (req, res) => {
    const { amount } = req.body;
    
    if (!amount || parseFloat(amount) < 0.001) {
        return res.json({
            success: false,
            error: 'Please enter a valid amount (min 0.001 ETH)'
        });
    }

    if (!account) {
        return res.json({
            success: false,
            error: 'Wallet not configured. Set TEST_PRIVATE_KEY in .env file'
        });
    }

    try {
        console.log(`🔄 Processing REAL withdrawal: ${amount} ETH from ${account.address}`);
        
        const result = await withdrawETH(amount);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                withdrawalHash: result.withdrawalHash,
                explorerUrl: `https://sepolia-explorer.giwa.io/tx/${result.withdrawalHash}`
            });
        } else {
            res.json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 GIWA Bridge DApp running on http://localhost:${PORT}`);
    console.log(`📧 Built by 0xEixa - https://x.com/eixaid`);
    console.log(`🔗 Ethereum Explorer: https://sepolia.etherscan.io`);
    console.log(`🔗 GIWA Explorer: https://sepolia-explorer.giwa.io`);
    
    if (account) {
        console.log(`✅ REAL MODE - Wallet: ${account.address}`);
        console.log(`💡 Make sure you have ETH on Sepolia for deposits`);
    } else {
        console.log(`❌ WALLET NOT CONFIGURED - Set TEST_PRIVATE_KEY in .env file`);
        process.exit(1);
    }
});
