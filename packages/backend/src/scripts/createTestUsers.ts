import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🧪 Creating test users...');

    const testUsers = [
      { username: 'testuser1', email: 'test1@win5x.com' },
      { username: 'testuser2', email: 'test2@win5x.com' },
      { username: 'testuser3', email: 'test3@win5x.com' },
    ];

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

      console.log(`✅ Created test user: ${userData.username} (ID: ${user.id})`);
    }

    console.log('\n📝 Test User Credentials:');
    console.log('Username: testuser1, Password: Test123!');
    console.log('Username: testuser2, Password: Test123!');
    console.log('Username: testuser3, Password: Test123!');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to generate referral code
function generateReferralCode(username: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.toUpperCase()}${randomSuffix}`;
}

createTestUsers();
