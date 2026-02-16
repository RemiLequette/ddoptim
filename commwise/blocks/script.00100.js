// ============================================================
// CommWise API Client with Authentication Handling
// ============================================================
// Provides: commwiseConfigClient.secureRequest()
// Used by: ALL data sources and connectors
//
// Standard usage:
// await commwiseConfigClient.secureRequest('{CUSTOMER_NUMBER}', 'DATAMART', {...})
// await commwiseConfigClient.secureRequest('{CUSTOMER_NUMBER}', 'MONDAY', {...})
// await commwiseConfigClient.secureRequest('{CUSTOMER_NUMBER}', 'SFTP', {...})

// ============================================================
// Nonce Validation & Auto-Refresh Recovery
// ============================================================

function handleNonceRefresh() {
    if (typeof Storage !== 'undefined') {
        const refreshCount = parseInt(localStorage.getItem('commwise_refresh_count') || '0');

        if (refreshCount < 3) {
            localStorage.setItem('commwise_refresh_count', String(refreshCount + 1));
            console.log(`CommWise: Performing hard refresh (attempt ${refreshCount + 1}/3)...`);
            setTimeout(() => window.location.reload(true), 1000);
            return;
        } else {
            localStorage.removeItem('commwise_refresh_count');
            throw new Error('Authentication failed after multiple attempts. Please refresh manually (Ctrl+F5).');
        }
    }
}

function validateAndFixNonce() {
    const nonce = window.commwiseConfig ? window.commwiseConfig.nonce : null;

    if (!nonce || nonce === 'fallback-nonce') {
        console.error('CommWise: Invalid nonce detected. Attempting recovery...');

        if (typeof Storage !== 'undefined') {
            const refreshCount = parseInt(localStorage.getItem('commwise_refresh_count') || '0');

            if (refreshCount < 3) {
                localStorage.setItem('commwise_refresh_count', String(refreshCount + 1));
                setTimeout(() => window.location.reload(true), 1000);
                return false;
            } else {
                localStorage.removeItem('commwise_refresh_count');
                console.error('CommWise: Multiple refresh attempts failed. Manual page refresh required.');
                return false;
            }
        }
    } else {
        if (typeof Storage !== 'undefined') {
            localStorage.removeItem('commwise_refresh_count');
        }
        console.log('CommWise: Valid nonce detected');
        return true;
    }
}

// ============================================================
// Secure Proxy Client
// ============================================================

const commwiseConfigClient = {
    secureRequest: function(customerCode, application, requestData) {
        return new Promise(function(resolve, reject) {
            const nonce = window.commwiseConfig ? window.commwiseConfig.nonce : 'fallback-nonce';

            fetch('/wp-json/commwise-config/v1/secure-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': nonce
                },
                body: JSON.stringify({
                    customer: customerCode,
                    application: application,
                    method: 'POST',
                    body: requestData
                })
            })
            .then(function(response) {
                // Check for 403 nonce errors and auto-refresh
                if (response.status === 403) {
                    return response.json().then(function(errorData) {
                        const errorString = JSON.stringify(errorData).toLowerCase();
                        if (errorString.includes('nonce') || errorString.includes('cookie_invalid') || errorString.includes('rest_cookie')) {
                            console.error('CommWise: Nonce authentication failed. Attempting auto-refresh...');
                            handleNonceRefresh();
                            return;
                        }
                        throw new Error('HTTP 403: Access denied - ' + JSON.stringify(errorData));
                    });
                }

                if (!response.ok) {
                    return response.text().then(function(errorText) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText + ' - ' + errorText);
                    });
                }

                return response.json();
            })
            .then(resolve)
            .catch(reject);
        });
    }
};

// Validate nonce on initialization
validateAndFixNonce();

console.log('CommWise API Client initialized');