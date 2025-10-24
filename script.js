// Screen Wake Lock functionality
let wakeLock = null;

// Request a screen wake lock
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
            updateWakeLockStatus(true);

            // Listen for wake lock release
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock has been released');
                updateWakeLockStatus(false);
            });
        } else {
            alert('Wake Lock API is not supported by your browser. Screen may sleep.');
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
        alert('Failed to activate screen lock. Your screen may sleep.');
    }
}

// Release the wake lock
async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
            updateWakeLockStatus(false);
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

// Update UI to show wake lock status
function updateWakeLockStatus(isActive) {
    const statusElement = document.getElementById('wakeLockStatus');
    const lockIcon = document.getElementById('lockIcon');
    const statusContainer = document.getElementById('wakeLockStatusContainer');
    const button = document.getElementById('toggleLockBtn');
    const btnText = button.querySelector('.btn-text');

    if (isActive) {
        statusElement.textContent = 'LOCKED';
        lockIcon.textContent = '●';
        statusContainer.classList.add('active');
        btnText.textContent = 'DISABLE SCREEN LOCK';
        button.classList.add('active');
    } else {
        statusElement.textContent = 'UNLOCKED';
        lockIcon.textContent = '○';
        statusContainer.classList.remove('active');
        btnText.textContent = 'ENABLE SCREEN LOCK';
        button.classList.remove('active');
    }
}

// Toggle wake lock on/off
document.getElementById('toggleLockBtn').addEventListener('click', async () => {
    if (wakeLock === null) {
        await requestWakeLock();
    } else {
        await releaseWakeLock();
    }
});

// Re-request wake lock when page becomes visible again
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Crypto price functionality
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Token configuration
const TOKENS = {
    bitcoin: { id: 'btc', name: 'BITCOIN' },
    ethereum: { id: 'eth', name: 'ETHEREUM' },
    solana: { id: 'sol', name: 'SOLANA' },
    dogecoin: { id: 'doge', name: 'DOGECOIN' },
    binancecoin: { id: 'bnb', name: 'BINANCE COIN' }
};

async function fetchCryptoPrices() {
    try {
        const tokenIds = Object.keys(TOKENS).join(',');
        const url = `${COINGECKO_API}?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true`;

        console.log('Fetching crypto prices from:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', response.status, errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Received crypto data:', data);

        updatePriceDisplay(data);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showError(error.message);
    }
}

function updatePriceDisplay(data) {
    // Update all tokens dynamically
    Object.keys(TOKENS).forEach(tokenKey => {
        const tokenData = data[tokenKey];
        if (!tokenData) return;

        const tokenId = TOKENS[tokenKey].id;
        const priceElement = document.getElementById(`${tokenId}-price`);
        const changeElement = document.getElementById(`${tokenId}-change`);

        if (priceElement && changeElement) {
            // Format price based on value
            const price = tokenData.usd;
            const decimals = price < 1 ? 4 : price < 100 ? 3 : 2;

            priceElement.textContent = price.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            priceElement.classList.remove('loading');

            // Update 24h change
            const changeValue = tokenData.usd_24h_change;
            changeElement.textContent = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`;
            changeElement.className = 'metric-value ' + (changeValue >= 0 ? 'positive' : 'negative');
        }
    });
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = timeString;
}

function showError(errorMessage) {
    console.warn('Displaying error state to user');
    Object.keys(TOKENS).forEach(tokenKey => {
        const tokenId = TOKENS[tokenKey].id;
        const priceElement = document.getElementById(`${tokenId}-price`);
        const changeElement = document.getElementById(`${tokenId}-change`);

        if (priceElement) {
            priceElement.textContent = 'ERROR';
            priceElement.classList.remove('loading');
        }
        if (changeElement) {
            changeElement.textContent = '--';
            changeElement.className = 'metric-value';
        }
    });

    // Show error in footer
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'API Error';
        lastUpdateElement.style.color = 'var(--status-danger)';
    }

    // Log helpful debugging info
    if (errorMessage && errorMessage.includes('CORS')) {
        console.error('⚠️ CORS ERROR: You may be opening the HTML file directly (file://). Try hosting it on a server or use GitHub Pages.');
    }
}

// Initial load
fetchCryptoPrices();

// Auto-refresh every 30 seconds
setInterval(fetchCryptoPrices, 30000);

// Add loading animation initially
Object.keys(TOKENS).forEach(tokenKey => {
    const tokenId = TOKENS[tokenKey].id;
    const priceElement = document.getElementById(`${tokenId}-price`);
    if (priceElement) {
        priceElement.classList.add('loading');
    }
});
