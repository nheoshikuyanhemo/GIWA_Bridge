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
            
            // Format wallet address
            const shortAddress = data.address.length > 10 
                ? `${data.address.substring(0, 6)}...${data.address.substring(data.address.length - 4)}`
                : data.address;
            
            document.getElementById('walletAddress').innerHTML = 
                `Address: <span style="font-family: monospace;">${shortAddress}</span>`;
            document.getElementById('l1Balance').textContent = `L1 Balance: ${data.l1Balance} ETH`;
            document.getElementById('l2Balance').textContent = `L2 Balance: ${data.l2Balance} ETH`;
        } catch (error) {
            console.error('Error loading wallet info:', error);
            document.getElementById('walletAddress').textContent = 'Address: Error loading wallet';
        }
    }

    setupEventListeners() {
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
                const message = `${result.message}<br>
                               <a href="${result.l1ExplorerUrl}" target="_blank" class="transaction-link">View on Etherscan</a> | 
                               <a href="${result.l2ExplorerUrl}" target="_blank" class="transaction-link">View on GIWA Explorer</a>`;
                this.showStatusHTML(status, message, 'success');
                this.addTransaction('deposit', amount, result.l1Hash, result.l1ExplorerUrl);
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
                const message = `${result.message}<br>
                               <a href="${result.explorerUrl}" target="_blank" class="transaction-link">View on GIWA Explorer</a>`;
                this.showStatusHTML(status, message, 'success');
                this.addTransaction('withdraw', amount, result.withdrawalHash, result.explorerUrl);
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

    showStatusHTML(element, message, type) {
        element.innerHTML = message;
        element.className = `status ${type}`;
    }

    addTransaction(type, amount, hash, explorerUrl) {
        const transactionList = document.getElementById('transactionList');
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const typeText = type === 'deposit' ? '📥 Deposit to L2' : '📤 Withdraw to L1';
        const shortHash = hash ? `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}` : 'Pending...';
        
        transactionItem.innerHTML = `
            <span>${typeText} - ${amount} ETH</span>
            <div>
                <span style="font-family: monospace; margin-right: 10px;">${shortHash}</span>
                ${explorerUrl ? `<a href="${explorerUrl}" target="_blank" class="transaction-link">View</a>` : ''}
            </div>
        `;
        
        transactionList.insertBefore(transactionItem, transactionList.firstChild);
    }
}

// Initialize the bridge when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.bridge = new GiwaBridge();
});
