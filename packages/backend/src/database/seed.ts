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

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });