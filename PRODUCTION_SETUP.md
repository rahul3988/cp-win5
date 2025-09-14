# Win5x Production Setup Guide

## 🚀 Server Deployment Instructions

### Prerequisites
- Linux/Windows Server with 4GB+ RAM, 2+ CPU cores
- Node.js 18+
- PNPM 8+
- PostgreSQL 13+
- Redis 6+
- Domain with SSL certificate

### 1. Environment Setup

Create `.env` file in `packages/backend/` with production values:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/win5x_production?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Configuration - CHANGE THESE!
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="production"

# Game Configuration
DEFAULT_BETTING_DURATION=30
DEFAULT_SPIN_DURATION=10
DEFAULT_RESULT_DURATION=15
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=10000
PAYOUT_MULTIPLIER=5

# Admin Configuration - CHANGE THESE!
ADMIN_USERNAME="admin"
ADMIN_EMAIL="admin@win5x.com"
ADMIN_PASSWORD="Admin123!"

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="info"

# Frontend URLs (for CORS) - UPDATE WITH YOUR DOMAIN
FRONTEND_ADMIN_URL="https://admin.yourdomain.com"
FRONTEND_USER_URL="https://yourdomain.com"
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb win5x_production

# Install dependencies (REQUIRED - node_modules not included)
pnpm install

# Build the application
pnpm build

# Run database migrations
cd packages/backend
pnpm db:migrate
pnpm db:generate

# Seed initial data
pnpm db:seed
pnpm create-admin
```

### 3. PM2 Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/win5x`:

```nginx
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

### 5. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

### 6. Firewall Configuration

```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3001  # Backend API (if direct access needed)
sudo ufw enable
```

### 7. Security Checklist

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

### 8. Monitoring & Maintenance

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs win5x-backend

# Restart application
pm2 restart win5x-backend
```

### 9. Database Backup

```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump win5x_production > backup_$DATE.sql
# Upload to cloud storage
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## 📞 Support

For technical support, contact: winein5x@gmail.com

## 🎯 Default Admin Credentials

- **Username**: admin
- **Email**: admin@win5x.com
- **Password**: Admin123!

**⚠️ IMPORTANT: Change these credentials immediately after deployment!**
