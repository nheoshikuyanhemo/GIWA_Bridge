import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/web')));

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/web/index.html'));
});

app.get('/api/wallet-info', (req, res) => {
    res.json({
        address: '0x' + Math.random().toString(16).substr(2, 40),
        l1Balance: (Math.random() * 2).toFixed(4),
        l2Balance: (Math.random() * 1).toFixed(4)
    });
});

app.post('/api/deposit', (req, res) => {
    const { amount } = req.body;
    const l1Hash = '0x' + Math.random().toString(16).substr(2, 64);
    res.json({
        success: true,
        message: `Demo Deposit ${amount} ETH initiated!`,
        l1Hash: l1Hash,
        l1ExplorerUrl: `https://sepolia.etherscan.io/tx/${l1Hash}`,
        l2ExplorerUrl: `https://sepolia-explorer.giwa.io/tx/${l1Hash}`
    });
});

app.post('/api/withdraw', (req, res) => {
    const { amount } = req.body;
    const withdrawalHash = '0x' + Math.random().toString(16).substr(2, 64);
    res.json({
        success: true,
        message: `Demo Withdrawal ${amount} ETH initiated!`,
        withdrawalHash: withdrawalHash,
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${withdrawalHash}`
    });
});

app.listen(PORT, () => {
    console.log(`🚀 GIWA Bridge DApp running on http://localhost:${PORT}`);
    console.log(`📧 Built by 0xEixa - https://x.com/eixaid`);
    console.log(`⚠️  Running in DEMO MODE`);
});
