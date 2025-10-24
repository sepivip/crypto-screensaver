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

async function fetchCryptoPrices() {
    try {
        const response = await fetch(
            `${COINGECKO_API}?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        updatePriceDisplay(data);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        showError();
    }
}

function updatePriceDisplay(data) {
    // Update Bitcoin
    if (data.bitcoin) {
        const btcPrice = document.getElementById('btc-price');
        const btcChange = document.getElementById('btc-change');

        btcPrice.textContent = data.bitcoin.usd.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        btcPrice.classList.remove('loading');

        const btcChangeValue = data.bitcoin.usd_24h_change;
        btcChange.textContent = `${btcChangeValue >= 0 ? '+' : ''}${btcChangeValue.toFixed(2)}%`;
        btcChange.className = 'metric-value ' + (btcChangeValue >= 0 ? 'positive' : 'negative');
    }

    // Update Ethereum
    if (data.ethereum) {
        const ethPrice = document.getElementById('eth-price');
        const ethChange = document.getElementById('eth-change');

        ethPrice.textContent = data.ethereum.usd.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        ethPrice.classList.remove('loading');

        const ethChangeValue = data.ethereum.usd_24h_change;
        ethChange.textContent = `${ethChangeValue >= 0 ? '+' : ''}${ethChangeValue.toFixed(2)}%`;
        ethChange.className = 'metric-value ' + (ethChangeValue >= 0 ? 'positive' : 'negative');
    }
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

function showError() {
    document.getElementById('btc-price').textContent = 'Error loading';
    document.getElementById('eth-price').textContent = 'Error loading';
}

// Initial load
fetchCryptoPrices();

// Auto-refresh every 30 seconds
setInterval(fetchCryptoPrices, 30000);

// Add loading animation initially
document.getElementById('btc-price').classList.add('loading');
document.getElementById('eth-price').classList.add('loading');
