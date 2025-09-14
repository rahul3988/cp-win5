# 🚀 Win5x Game Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ System Requirements
- **Server:** Linux/Windows Server with 4GB+ RAM, 2+ CPU cores
- **Node.js:** Version 18+ 
- **PNPM:** Version 8+
- **PostgreSQL:** Version 13+
- **Redis:** Version 6+
- **Domain:** With SSL certificate

### ✅ Environment Setup
1. **Database Setup:**
   ```bash
   # Create PostgreSQL database
   createdb win5x_production
   
   # Create Redis instance
   redis-server --daemonize yes
   ```

2. **Environment Variables:**
   ```bash
   # Backend (.env)
   DATABASE_URL="postgresql://username:password@localhost:5432/win5x_production"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your-super-secure-jwt-secret-key-here"
   JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"
   NODE_ENV="production"
   PORT=3001
   CORS_ORIGIN="https://yourdomain.com,https://admin.yourdomain.com"
   
   # Admin (.env)
   VITE_API_URL="https://api.yourdomain.com"
   VITE_APP_NAME="Win5x Admin"
   
   # User (.env)
   VITE_API_URL="https://api.yourdomain.com"
   VITE_APP_NAME="Win5x Game"
   ```

## 🏗️ Deployment Steps

### Step 1: Build the Application
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Step 2: Database Migration
```bash
cd packages/backend
pnpm db:migrate
pnpm db:generate
```

### Step 3: Seed Initial Data
```bash
# Seed payment methods
pnpm db:seed:payment-methods

# Create admin user
pnpm db:seed:admin
```

### Step 4: Production Server Setup

#### Option A: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'win5x-backend',
      script: 'packages/backend/dist/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option B: Docker (Alternative)
```bash
# Create Dockerfile for backend
cat > packages/backend/Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3001
CMD ["node", "dist/server.js"]
EOF

# Build and run
docker build -t win5x-backend packages/backend/
docker run -d -p 3001:3001 --name win5x-backend win5x-backend
```

### Step 5: Web Server Configuration

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/win5x
server {
    listen 80;
    server_name yourdomain.com admin.yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    root /var/www/win5x/packages/user/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    root /var/www/win5x/packages/admin/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 6: SSL Certificate Setup
```bash
# Using Let's Encrypt (Certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

### Step 7: Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3001  # Backend API (if direct access needed)
sudo ufw enable
```

## 🔧 Production Optimizations

### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_round_id ON bets(round_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

### 2. Redis Configuration
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs win5x-backend

# Restart application
pm2 restart win5x-backend
```

## 📊 Monitoring & Maintenance

### 1. Health Checks
```bash
# Check backend health
curl https://api.yourdomain.com/api/health

# Check database connection
curl https://api.yourdomain.com/api/game/config
```

### 2. Log Monitoring
```bash
# View real-time logs
pm2 logs win5x-backend --lines 100

# View error logs
pm2 logs win5x-backend --err --lines 50
```

### 3. Database Backup
```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump win5x_production > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## 🚨 Security Checklist

### ✅ Production Security
- [ ] Change default admin credentials
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Regular security updates
- [ ] Monitor failed login attempts
- [ ] Set up firewall rules
- [ ] Regular backups

### ✅ Environment Security
- [ ] Remove development dependencies
- [ ] Set NODE_ENV=production
- [ ] Use environment variables for secrets
- [ ] Disable debug logging
- [ ] Set up log rotation
- [ ] Monitor disk space

## 🔄 Update Process

### 1. Code Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build application
pnpm build

# Run migrations (if any)
cd packages/backend
pnpm db:migrate

# Restart application
pm2 restart win5x-backend
```

### 2. Database Updates
```bash
# Backup before migration
pg_dump win5x_production > backup_before_update.sql

# Run migrations
cd packages/backend
pnpm db:migrate

# Verify data integrity
```

## 📞 Support & Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Check firewall settings

2. **Redis Connection Failed**
   - Check REDIS_URL in .env
   - Verify Redis is running
   - Check Redis configuration

3. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify proxy configuration
   - Check firewall for WebSocket support

4. **Build Failures**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Check TypeScript errors

### Performance Monitoring
```bash
# Monitor system resources
htop
iostat -x 1
free -h

# Monitor application
pm2 monit
pm2 logs win5x-backend --lines 1000 | grep ERROR
```

## 🎉 Deployment Complete!

Your Win5x game is now ready for production! 

**Access URLs:**
- **User Game:** https://yourdomain.com
- **Admin Panel:** https://admin.yourdomain.com
- **API:** https://api.yourdomain.com

**Default Admin Credentials:**
- Username: `superadmin`
- Password: `superadmin123` (CHANGE IMMEDIATELY!)

Remember to:
1. Change default admin password
2. Set up monitoring
3. Configure backups
4. Test all functionality
5. Monitor logs for errors

Good luck with your deployment! 🚀