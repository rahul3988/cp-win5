// Test axios configuration
import axios from 'axios';

async function testAxiosConfig() {
  console.log('🔍 Testing Axios Configuration...');
  
  // Test 1: Basic axios instance
  console.log('\n📡 Test 1: Basic Axios Instance');
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'testuser1',
      password: 'Test123!'
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Direct backend connection successful:', response.status);
  } catch (error) {
    console.error('❌ Direct backend connection failed:', error.message);
  }
  
  // Test 2: Through proxy
  console.log('\n📡 Test 2: Through User Frontend Proxy');
  try {
    const response = await axios.post('http://localhost:3002/api/auth/login', {
      username: 'testuser1',
      password: 'Test123!'
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Proxy connection successful:', response.status);
  } catch (error) {
    console.error('❌ Proxy connection failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout error - this is the issue!');
    }
  }
  
  // Test 3: With longer timeout
  console.log('\n📡 Test 3: With 30 second timeout');
  try {
    const response = await axios.post('http://localhost:3002/api/auth/login', {
      username: 'testuser1',
      password: 'Test123!'
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Long timeout connection successful:', response.status);
  } catch (error) {
    console.error('❌ Long timeout connection failed:', error.message);
  }
}

testAxiosConfig();
