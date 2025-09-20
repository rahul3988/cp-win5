import { PrismaClient } from '@prisma/client';
import { GAME_CONFIG } from '@win5x/common';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if default game config exists
  const existingConfig = await prisma.gameConfig.findFirst({
    where: { isActive: true },
  });

  if (!existingConfig) {
    console.log('📝 Creating default game configuration...');
    
    await prisma.gameConfig.create({
      data: {
        bettingDuration: GAME_CONFIG.DEFAULT_BETTING_DURATION,
        spinDuration: GAME_CONFIG.DEFAULT_SPINNING_DURATION,
        resultDuration: GAME_CONFIG.DEFAULT_RESULT_DURATION,
        minBetAmount: GAME_CONFIG.MIN_BET_AMOUNT,
        maxBetAmount: GAME_CONFIG.MAX_BET_AMOUNT,
        payoutMultiplier: GAME_CONFIG.PAYOUT_MULTIPLIER,
        cashbackPercentage: GAME_CONFIG.CASHBACK_PERCENTAGE,
        maxExposure: GAME_CONFIG.MAX_EXPOSURE_MULTIPLIER * GAME_CONFIG.MAX_BET_AMOUNT,
        isActive: true,
      },
    });
    
    console.log('✅ Default game configuration created');
  } else {
    console.log('ℹ️  Default game configuration already exists');
  }

  // Create default payment methods
  const paymentMethods = [
    {
      name: 'phonepe',
      displayName: 'PhonePe',
      isActive: true,
      minAmount: 10.00,
      maxAmount: 100000.00,
    },
    {
      name: 'googlepay',
      displayName: 'Google Pay',
      isActive: true,
      minAmount: 10.00,
      maxAmount: 100000.00,
    },
    {
      name: 'paytm',
      displayName: 'Paytm',
      isActive: true,
      minAmount: 10.00,
      maxAmount: 100000.00,
    },
    {
      name: 'usdt',
      displayName: 'USDT',
      isActive: true,
      minAmount: 10.00,
      maxAmount: 100000.00,
    },
    {
      name: 'win5x-coin',
      displayName: 'Win5x Coin',
      isActive: true,
      minAmount: 10.00,
      maxAmount: 100000.00,
      instructions: 'Deposit using Win5x Coins to get 5% bonus',
    },
  ];

  for (const method of paymentMethods) {
    const existing = await prisma.paymentMethod.findUnique({
      where: { name: method.name },
    });

    if (!existing) {
      await prisma.paymentMethod.create({
        data: method,
      });
      console.log(`✅ Created payment method: ${method.displayName}`);
    } else {
      console.log(`ℹ️  Payment method already exists: ${method.displayName}`);
    }
  }

  console.log('🎉 Database seeding completed successfully!');
}

// Function to create default admin user
async function createDefaultAdmin() {
  try {
    console.log('🔧 Creating default admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: { username: 'admin' },
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      return;
    }

    // Import bcrypt here to avoid issues
    const bcrypt = require('bcryptjs');

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash('Admin123!', saltRounds);

    // Create admin user
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        email: 'admin@win5x.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        permissions: [
          'MANAGE_BETS',
          'MANAGE_USERS',
          'MANAGE_WITHDRAWALS',
          'MANAGE_DEPOSITS',
          'VIEW_ANALYTICS',
          'EMERGENCY_CONTROLS',
          'MANAGE_TIMERS',
          'GIFT_CODES',
        ],
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully');
    console.log('   Username: admin');
    console.log('   Email: admin@win5x.com');
    console.log('   Password: Admin123!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Function to create test users
async function createTestUsers() {
  try {
    console.log('🧪 Creating test users...');

    const testUsers = [
      { username: 'testuser1', email: 'test1@win5x.com' },
      { username: 'testuser2', email: 'test2@win5x.com' },
      { username: 'testuser3', email: 'test3@win5x.com' },
    ];

    const bcrypt = require('bcryptjs');
    const password = 'Test123!';
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { username: userData.username },
      });

      if (existingUser) {
        console.log(`ℹ️  Test user ${userData.username} already exists`);
        continue;
      }

      // Generate referral code
      const referralCode = generateReferralCode(userData.username);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          avatarUrl: 'avatar-1',
          referralCode,
          walletBetting: 1000.0, // Give test users some initial balance
          walletGaming: 100.0,
          isActive: true,
        },
      });

      console.log(`✅ Created test user: ${userData.username}`);
    }

    console.log('\n📝 Test User Credentials:');
    console.log('Username: testuser1, Password: Test123!');
    console.log('Username: testuser2, Password: Test123!');
    console.log('Username: testuser3, Password: Test123!');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
}

// Helper function to generate referral code
function generateReferralCode(username: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.toUpperCase()}${randomSuffix}`;
}

// Enhanced main function
async function enhancedMain() {
  await main();
  await createDefaultAdmin();
  await createTestUsers();
}

enhancedMain()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });