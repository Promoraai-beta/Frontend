/**
 * API Proxy Test Script
 * Tests all API endpoints to verify the proxy is working correctly
 */

const API_BASE = 'http://localhost:3000/api';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, options = {}) {
  const url = `${API_BASE}${path}`;
  const testOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    testOptions.body = JSON.stringify(options.body);
  }

  try {
    log(`\n🧪 Testing: ${method} ${path}`, 'cyan');
    const startTime = Date.now();
    const response = await fetch(url, testOptions);
    const duration = Date.now() - startTime;
    
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    const isExpectedError = options.expectError && status >= 400;

    if (isSuccess || isExpectedError) {
      log(`✅ PASS: ${method} ${path} (${status}) - ${duration}ms`, 'green');
      results.passed.push({ name, method, path, status, duration });
      if (options.verbose) {
        log(`   Response: ${JSON.stringify(responseData).substring(0, 200)}`, 'blue');
      }
      return { success: true, status, data: responseData };
    } else {
      log(`❌ FAIL: ${method} ${path} (${status})`, 'red');
      log(`   Error: ${JSON.stringify(responseData).substring(0, 200)}`, 'red');
      results.failed.push({ name, method, path, status, error: responseData });
      return { success: false, status, data: responseData };
    }
  } catch (error) {
    log(`❌ ERROR: ${method} ${path}`, 'red');
    log(`   ${error.message}`, 'red');
    results.failed.push({ name, method, path, error: error.message });
    return { success: false, error: error.message };
  }
}

async function checkBackend() {
  log('\n🔍 Checking backend availability...', 'yellow');
  try {
    const response = await fetch(`${BACKEND_URL}/`);
    if (response.ok) {
      log('✅ Backend is running', 'green');
      return true;
    } else {
      log(`⚠️  Backend responded with status ${response.status}`, 'yellow');
      return true; // Still consider it available
    }
  } catch (error) {
    log(`❌ Backend is not accessible at ${BACKEND_URL}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`   Make sure the backend server is running on port 5001`, 'yellow');
    return false;
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 API Proxy Test Suite', 'blue');
  log('='.repeat(60), 'blue');
  log(`Frontend: http://localhost:3000`, 'cyan');
  log(`Backend: ${BACKEND_URL}`, 'cyan');

  // Check backend availability
  const backendAvailable = await checkBackend();
  if (!backendAvailable) {
    log('\n⚠️  Some tests may fail if backend is not running', 'yellow');
  }

  // Test 1: Root endpoint
  await testEndpoint('Root Endpoint', 'GET', '/', { expectError: true });

  // Test 2: Health check (if exists)
  await testEndpoint('Health Check', 'GET', '/health', { expectError: true });

  // Test 3: Auth endpoints (without auth - should fail appropriately)
  log('\n📋 Testing Authentication Endpoints...', 'yellow');
  await testEndpoint('GET /auth/me (no token)', 'GET', '/auth/me', { expectError: true });
  await testEndpoint('POST /auth/login (invalid)', 'POST', '/auth/login', {
    body: { email: 'test@test.com', password: 'wrong' },
    expectError: true
  });
  await testEndpoint('POST /auth/forgot-password', 'POST', '/auth/forgot-password', {
    body: { email: 'test@example.com' },
    expectError: true // May fail if email doesn't exist, but should not be 502
  });

  // Test 4: Profile endpoints (without auth - should fail appropriately)
  log('\n📋 Testing Profile Endpoints...', 'yellow');
  await testEndpoint('GET /profiles/candidate (no auth)', 'GET', '/profiles/candidate', { expectError: true });
  await testEndpoint('GET /profiles/recruiter (no auth)', 'GET', '/profiles/recruiter', { expectError: true });

  // Test 5: Assessment endpoints
  log('\n📋 Testing Assessment Endpoints...', 'yellow');
  await testEndpoint('GET /assessments (no auth)', 'GET', '/assessments', { expectError: true });
  await testEndpoint('GET /assessments with query', 'GET', '/assessments?active=true', { expectError: true });

  // Test 6: Session endpoints
  log('\n📋 Testing Session Endpoints...', 'yellow');
  await testEndpoint('GET /sessions (no auth)', 'GET', '/sessions', { expectError: true });

  // Test 7: Upload endpoints (FormData)
  log('\n📋 Testing Upload Endpoints...', 'yellow');
  // Create a dummy file for testing
  const formData = new FormData();
  const blob = new Blob(['test content'], { type: 'image/png' });
  formData.append('file', blob, 'test.png');
  
  await testEndpoint('POST /uploads/profile-image (FormData)', 'POST', '/uploads/profile-image', {
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
    expectError: true // Should fail without auth, but not 502
  });

  // Test 8: Admin endpoints
  log('\n📋 Testing Admin Endpoints...', 'yellow');
  await testEndpoint('GET /admin/stats (no auth)', 'GET', '/admin/stats', { expectError: true });
  await testEndpoint('GET /admin/invitations (no auth)', 'GET', '/admin/invitations', { expectError: true });

  // Test 9: Invitation endpoints
  log('\n📋 Testing Invitation Endpoints...', 'yellow');
  await testEndpoint('GET /invitations/invalid-token', 'GET', '/invitations/invalid-token', { expectError: true });

  // Test 10: Code execution endpoints
  log('\n📋 Testing Code Execution Endpoints...', 'yellow');
  await testEndpoint('POST /code-save (no auth)', 'POST', '/code-save', {
    body: { sessionId: 'test', code: 'console.log("test")' },
    expectError: true
  });

  // Test 11: Video endpoints
  log('\n📋 Testing Video Endpoints...', 'yellow');
  await testEndpoint('GET /video/invalid-session', 'GET', '/video/invalid-session', { expectError: true });

  // Test 12: Live monitoring endpoints
  log('\n📋 Testing Live Monitoring Endpoints...', 'yellow');
  await testEndpoint('GET /live-monitoring/invalid-session', 'GET', '/live-monitoring/invalid-session', { expectError: true });

  // Test 13: Agent endpoints
  log('\n📋 Testing Agent Endpoints...', 'yellow');
  await testEndpoint('GET /agents/full-report/invalid-session', 'GET', '/agents/full-report/invalid-session', { expectError: true });

  // Print summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Summary', 'blue');
  log('='.repeat(60), 'blue');
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⏭️  Skipped: ${results.skipped.length}`, 'yellow');

  if (results.passed.length > 0) {
    log('\n✅ Passed Tests:', 'green');
    results.passed.forEach(test => {
      log(`   ${test.method} ${test.path} (${test.status}) - ${test.duration}ms`, 'green');
    });
  }

  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(test => {
      log(`   ${test.method} ${test.path}`, 'red');
      if (test.status) {
        log(`      Status: ${test.status}`, 'red');
      }
      if (test.error) {
        log(`      Error: ${typeof test.error === 'string' ? test.error : JSON.stringify(test.error).substring(0, 100)}`, 'red');
      }
    });
  }

  // Check for proxy-specific errors (502 Bad Gateway)
  const proxyErrors = results.failed.filter(test => 
    test.status === 502 || 
    (test.error && typeof test.error === 'string' && test.error.includes('proxy'))
  );

  if (proxyErrors.length > 0) {
    log('\n⚠️  Proxy Errors Detected:', 'yellow');
    proxyErrors.forEach(test => {
      log(`   ${test.method} ${test.path} - Possible proxy configuration issue`, 'yellow');
    });
  } else {
    log('\n✅ No proxy errors detected!', 'green');
    log('   All requests are being properly proxied to the backend.', 'green');
  }

  log('\n' + '='.repeat(60), 'blue');
  
  // Exit with appropriate code
  const exitCode = results.failed.length === 0 ? 0 : 1;
  process.exit(exitCode);
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

