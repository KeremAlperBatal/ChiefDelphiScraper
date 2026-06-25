const https = require('https');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only GET allowed
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const targetUrl = event.queryStringParameters?.url;

    if (!targetUrl) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing url parameter' }) };
    }

    // Only allow chiefdelphi.com
    if (!targetUrl.includes('chiefdelphi.com')) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only chiefdelphi.com URLs are allowed' }) };
    }

    try {
        const data = await new Promise((resolve, reject) => {
            https.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        reject(new Error(`Chief Delphi returned HTTP ${res.statusCode}`));
                    } else {
                        resolve(body);
                    }
                });
            }).on('error', reject);
        });

        return { statusCode: 200, headers, body: data };
    } catch (err) {
        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: 'Proxy request failed: ' + err.message }),
        };
    }
};
