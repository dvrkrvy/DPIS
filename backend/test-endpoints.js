/**
 * Test Screening and Resources Endpoints
 */

const https = require('https');

const API_BASE_URL = 'https://dpis-backend.onrender.com';
const TEST_TOKEN = process.argv[2]; // Pass token as argument

if (!TEST_TOKEN) {
  console.error('Usage: node test-endpoints.js <JWT_TOKEN>');
  console.error('Get a token by registering: node test-registration.js');
  process.exit(1);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing endpoints with token...\n');

  // Test screening tests endpoint
  try {
    console.log('1️⃣ Testing GET /api/screening/tests');
    const testsRes = await makeRequest(`${API_BASE_URL}/api/screening/tests`);
    console.log('✅ Status:', testsRes.status);
    console.log('✅ Response:', JSON.stringify(testsRes.data, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Test resources endpoint
  try {
    console.log('\n2️⃣ Testing GET /api/resources');
    const resourcesRes = await makeRequest(`${API_BASE_URL}/api/resources`);
    console.log('✅ Status:', resourcesRes.status);
    console.log('✅ Resources count:', resourcesRes.data.resources?.length || 0);
    if (resourcesRes.data.resources?.length > 0) {
      console.log('✅ First resource:', JSON.stringify(resourcesRes.data.resources[0], null, 2));
    } else {
      console.log('⚠️  No resources found - database might be empty');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Test resources categories
  try {
    console.log('\n3️⃣ Testing GET /api/resources/meta/categories');
    const categoriesRes = await makeRequest(`${API_BASE_URL}/api/resources/meta/categories`);
    console.log('✅ Status:', categoriesRes.status);
    console.log('✅ Categories:', categoriesRes.data.categories || []);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testEndpoints().catch(console.error);
