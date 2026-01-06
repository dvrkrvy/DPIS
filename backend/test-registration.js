/**
 * Test Registration Endpoint
 * 
 * This script tests the registration endpoint to see what error occurs.
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'https://dpis-backend.onrender.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testRegistration() {
  console.log('🧪 Testing registration endpoint...\n');
  console.log(`📍 API URL: ${API_BASE_URL}\n`);

  try {
    console.log('📤 Sending POST request to /api/auth/register...');
    const response = await makeRequest(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log('✅ Registration successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.token && response.data.user) {
      console.log('\n✅ Token received:', response.data.token.substring(0, 20) + '...');
      console.log('✅ User ID:', response.data.user.id);
      console.log('✅ Anonymous ID:', response.data.user.anonymousId);
    }

  } catch (error) {
    console.error('\n❌ Registration failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.error('\n💡 Request timeout - backend might be starting up');
      console.error('   Wait a minute and try again');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Cannot connect to backend');
      console.error('   Check if backend is running on Render');
      console.error(`   Verify ${API_BASE_URL} is accessible`);
    } else {
      console.error('\n💡 Check Render logs for more details');
      console.error('   Go to: Render Dashboard → Your Service → Logs');
    }
  }
}

// Also test health endpoint
async function testHealth() {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const response = await makeRequest(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function main() {
  const healthOk = await testHealth();
  
  if (!healthOk) {
    console.error('\n⚠️  Backend health check failed. Backend might not be running.');
    console.error('   Check Render Dashboard to ensure service is deployed and running.');
    return;
  }
  
  await testRegistration();
}

main().catch(console.error);
