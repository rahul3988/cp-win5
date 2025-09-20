import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
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

    console.log('✅ Admin user created successfully:');
    console.log(`   Username: admin`);
    console.log(`   Email: admin@win5x.com`);
    console.log(`   Password: Admin123!`);
    console.log(`   ID: ${admin.id}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
