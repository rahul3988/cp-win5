// Debug script to test user login flow
const testUserLogin = async () => {
  console.log('🔍 Starting user login debug...');
  
  try {
    // Test 1: Check if API endpoint is accessible
    console.log('📡 Testing API endpoint accessibility...');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser1',
        password: 'Test123!'
      })
    });
    
    console.log('✅ API Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response Data:', data);
    
    if (data.success) {
      console.log('✅ Login successful!');
      console.log('👤 User:', data.data.user);
      console.log('🔑 Access Token:', data.data.accessToken ? 'Present' : 'Missing');
      console.log('🔄 Refresh Token:', data.data.refreshToken ? 'Present' : 'Missing');
      
      // Test 2: Store tokens in localStorage
      console.log('💾 Testing token storage...');
      const tokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken
      };
      
      localStorage.setItem('user_tokens', JSON.stringify(tokens));
      console.log('✅ Tokens stored in localStorage');
      
      // Test 3: Retrieve tokens from localStorage
      console.log('📖 Testing token retrieval...');
      const storedTokens = JSON.parse(localStorage.getItem('user_tokens') || '{}');
      console.log('✅ Stored tokens:', storedTokens);
      
      // Test 4: Test token verification
      console.log('🔍 Testing token verification...');
      const verifyResponse = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });
      
      console.log('✅ Verify Response Status:', verifyResponse.status);
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ Token verification successful:', verifyData);
      } else {
        console.log('❌ Token verification failed');
      }
      
    } else {
      console.log('❌ Login failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.error('❌ Error stack:', error.stack);
  }
};

// Run the debug test
testUserLogin();
