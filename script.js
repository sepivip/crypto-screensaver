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

// Track previous BTC price for flash comparison
let previousBtcPrice = null;

// API retry logic
let apiErrorCount = 0;
let refreshInterval = 60000; // Start at 60 seconds
let refreshTimer = null;

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

        // Success! Reset error count and interval
        apiErrorCount = 0;
        refreshInterval = 60000; // Back to 60s

        updatePriceDisplay(data);
        updateLastUpdateTime();
        scheduleNextFetch();
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Handle API errors with exponential backoff
        handleApiError(error.message);
    }
}

function handleApiError(errorMessage) {
    apiErrorCount++;

    // Exponential backoff: 60s, 120s, 300s (5min)
    if (apiErrorCount === 1) {
        refreshInterval = 60000; // 60s
    } else if (apiErrorCount === 2) {
        refreshInterval = 120000; // 2min
    } else {
        refreshInterval = 300000; // 5min
    }

    console.warn(`⚠️ API Error #${apiErrorCount}. Next retry in ${refreshInterval/1000}s`);

    showError(errorMessage);
    scheduleNextFetch();
}

function scheduleNextFetch() {
    // Clear existing timer
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    // Schedule next fetch
    refreshTimer = setTimeout(fetchCryptoPrices, refreshInterval);
    console.log(`⏰ Next fetch scheduled in ${refreshInterval/1000}s`);
}

function updatePriceDisplay(data) {
    let currentBtcPrice = null;

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

            // Track BTC price for flash comparison
            if (tokenId === 'btc') {
                currentBtcPrice = price;
            }
        }
    });

    // Trigger lightning flash based on price movement
    triggerPriceFlash(currentBtcPrice);
}

// Trigger lightning flash when BTC price changes
function triggerPriceFlash(currentPrice) {
    if (currentPrice === null || currentPrice === undefined) {
        return; // No price data
    }

    // First load - just store the price, no flash
    if (previousBtcPrice === null) {
        previousBtcPrice = currentPrice;
        console.log('💰 Initial BTC price:', currentPrice);
        return;
    }

    // Compare prices
    const priceDiff = currentPrice - previousBtcPrice;

    if (priceDiff > 0) {
        // Price went UP - GREEN LIGHTNING
        flashBackground('green');
        console.log('⚡ GREEN FLASH: BTC +$' + priceDiff.toFixed(2) + ' (was $' + previousBtcPrice.toFixed(2) + ', now $' + currentPrice.toFixed(2) + ')');
    } else if (priceDiff < 0) {
        // Price went DOWN - RED LIGHTNING
        flashBackground('red');
        console.log('⚡ RED FLASH: BTC -$' + Math.abs(priceDiff).toFixed(2) + ' (was $' + previousBtcPrice.toFixed(2) + ', now $' + currentPrice.toFixed(2) + ')');
    } else {
        // Price unchanged (rare)
        console.log('➡️ No change: BTC still $' + currentPrice.toFixed(2));
    }

    // Update previous price
    previousBtcPrice = currentPrice;
}

// Quick lightning flash effect
function flashBackground(color) {
    const body = document.body;

    // Remove any existing flash
    body.classList.remove('price-flash-green', 'price-flash-red');

    // Trigger reflow to restart animation
    void body.offsetWidth;

    // Add flash class
    if (color === 'green') {
        body.classList.add('price-flash-green');
    } else {
        body.classList.add('price-flash-red');
    }

    // Remove after animation (1 second)
    setTimeout(() => {
        body.classList.remove('price-flash-green', 'price-flash-red');
    }, 1000);
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

// Add loading animation initially
Object.keys(TOKENS).forEach(tokenKey => {
    const tokenId = TOKENS[tokenKey].id;
    const priceElement = document.getElementById(`${tokenId}-price`);
    if (priceElement) {
        priceElement.classList.add('loading');
    }
});

// Initial load (will schedule next fetch automatically)
fetchCryptoPrices();

// ========================================
// Fullscreen Functionality
// ========================================

let isFullscreen = false;

function toggleFullscreen() {
    if (!isFullscreen) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', updateFullscreenStatus);
document.addEventListener('webkitfullscreenchange', updateFullscreenStatus);
document.addEventListener('msfullscreenchange', updateFullscreenStatus);

function updateFullscreenStatus() {
    isFullscreen = !!(document.fullscreenElement ||
                     document.webkitFullscreenElement ||
                     document.msFullscreenElement);

    const btn = document.getElementById('toggleFullscreenBtn');
    if (!btn) return;

    const btnText = btn.querySelector('.btn-text');
    if (!btnText) return;

    if (isFullscreen) {
        btnText.textContent = 'EXIT';
        btn.classList.add('active');
        console.log('📺 Fullscreen: ON');
    } else {
        btnText.textContent = 'FULLSCREEN';
        btn.classList.remove('active');
        console.log('📺 Fullscreen: OFF');
    }
}

// Bind fullscreen button
const fullscreenBtn = document.getElementById('toggleFullscreenBtn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    console.log('✅ Fullscreen button bound successfully');
} else {
    console.error('❌ Fullscreen button not found!');
}
