import { PrismaClient } from '@prisma/client';

export class ConfigService {
  constructor(private prisma: PrismaClient) {}

  async getConfig() {
    let cfg = await this.prisma.adminConfig.findFirst();
    if (!cfg) {
      cfg = await this.prisma.adminConfig.create({
        data: {
          referralLevel1Pct: 0,
          referralLevel2Pct: 0,
          referralLevel3Pct: 0,
          attendanceDay7Amt: 60,
          depositBonusPct: 5,
          attendanceTiers: JSON.stringify([5,10,15,20,30,40,60]),
        },
      });
    }
    return cfg;
  }

  async updateConfig(data: Partial<{ referralLevel1Pct: number; referralLevel2Pct: number; referralLevel3Pct: number; attendanceDay7Amt: number; depositBonusPct: number; attendanceTiers: number[] }>) {
    const cfg = await this.getConfig();
    const payload: any = { ...data };
    if (Array.isArray(data.attendanceTiers)) {
      payload.attendanceTiers = JSON.stringify(data.attendanceTiers);
    }
    return this.prisma.adminConfig.update({ where: { id: cfg.id }, data: payload });
  }
}


