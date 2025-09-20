import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🧪 Creating single test user...');

    const username = process.argv[2] || 'testuser1';
    const email = process.argv[3] || 'test1@win5x.com';
    const password = process.argv[4] || 'Test123!';

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { username },
    });

    if (existingUser) {
      console.log(`ℹ️  User ${username} already exists`);
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate referral code
    const referralCode = generateReferralCode(username);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        avatarUrl: 'avatar-1',
        referralCode,
        walletBetting: 1000.0, // Give test user some initial balance
        walletGaming: 100.0,
        isActive: true,
      },
    });

    console.log('✅ Test user created successfully:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Referral Code: ${referralCode}`);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to generate referral code
function generateReferralCode(username: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.toUpperCase()}${randomSuffix}`;
}

createTestUser();
