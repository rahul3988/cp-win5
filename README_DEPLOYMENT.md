# Win5x Game Platform - Production Ready

## 🎯 Project Overview

Win5x is a complete online gaming platform featuring:
- **User Game Interface**: Modern React-based gaming interface
- **Admin Panel**: Comprehensive admin dashboard for game management
- **Backend API**: Node.js/Express API with real-time WebSocket support
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session management and real-time data

## 📁 Project Structure

```
win5x/
├── packages/
│   ├── user/          # User game interface (React + Vite)
│   ├── admin/         # Admin panel (React + Vite)
│   ├── backend/       # Backend API (Node.js + Express)
│   └── common/        # Shared types and utilities
├── scripts/           # Deployment scripts
├── ecosystem.config.js # PM2 configuration
├── deploy.sh          # Linux deployment script
├── deploy.ps1         # Windows deployment script
└── PRODUCTION_SETUP.md # Detailed setup guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PNPM 8+
- PostgreSQL 13+
- Redis 6+
- PM2 (for process management)

### 1. Install Dependencies
**Note**: This project comes without node_modules to reduce size. You must install dependencies first.

```bash
pnpm install
```

### 2. Configure Environment
Create `packages/backend/.env` with your production settings:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/win5x_production"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret"
NODE_ENV="production"
PORT=3001
```

### 3. Deploy
**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```powershell
.\deploy.ps1
```

## 🔧 Manual Setup

### Database Setup
```bash
# Create database
createdb win5x_production

# Run migrations
cd packages/backend
pnpm db:migrate
pnpm db:generate
pnpm db:seed
pnpm create-admin
```

### Build Application
```bash
pnpm build
```

### Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Access Points

- **User Game**: `http://yourdomain.com`
- **Admin Panel**: `http://admin.yourdomain.com`
- **API**: `http://api.yourdomain.com`

## 🔑 Default Admin Credentials

- **Username**: admin
- **Email**: admin@win5x.com
- **Password**: Admin123!

**⚠️ IMPORTANT: Change these immediately after deployment!**

## 📊 Features

### User Features
- Real-time number betting game
- Wallet system (Betting + Gaming wallets)
- Daily attendance rewards
- Transaction history
- Referral system
- Promotional codes

### Admin Features
- User management
- Game configuration
- Payment management
- Analytics dashboard
- Transaction monitoring
- System diagnostics

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## 📈 Monitoring

```bash
# View application status
pm2 status

# View logs
pm2 logs win5x-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart win5x-backend
```

## 🛠️ Maintenance

### Database Backup
```bash
pg_dump win5x_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Log Rotation
```bash
pm2 install pm2-logrotate
```

### Updates
```bash
git pull origin main
pnpm install
pnpm build
pm2 restart win5x-backend
```

## 📞 Support

For technical support or questions:
- **Email**: winein5x@gmail.com
- **Documentation**: See PRODUCTION_SETUP.md for detailed configuration

## 📄 License

This project is proprietary software. All rights reserved.

---

**Ready for Production Deployment** ✅
