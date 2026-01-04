# Deployment Guide - Monitoring BBM Bosowa

> Version: 1.0
> Last Updated: 2026-01-04
> Target: VPS Ubuntu 22.04 + aaPanel

---

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| OS | Ubuntu 22.04 | Ubuntu 22.04 LTS |
| RAM | 2 GB | 4 GB |
| CPU | 2 vCPU | 2 vCPU |
| Storage | 20 GB | 40 GB SSD |

### Software Requirements

- aaPanel (latest version)
- Node.js 20 LTS
- MySQL 8.0+
- Nginx
- PM2 (Process Manager)

---

## 1. Server Preparation

### 1.1 Update System

```bash
# Connect to your VPS via SSH
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Makassar
```

### 1.2 Install aaPanel

```bash
# Install aaPanel
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh
bash install.sh aapanel

# After installation, you'll get:
# - Panel URL: http://your-ip:8888
# - Username: xxxxxxxx
# - Password: xxxxxxxx
```

### 1.3 Access aaPanel

1. Open browser: `http://your-vps-ip:8888`
2. Login with credentials from installation
3. Install recommended packages:
   - **Nginx** (1.24+)
   - **MySQL** (8.0+)
   - **PHP** (8.2+) - optional, for aaPanel features

---

## 2. Database Setup

### 2.1 Create Database via aaPanel

1. Go to **Databases** → **MySQL**
2. Click **Add Database**
3. Fill form:
   ```
   Database Name: monitoring_bosowa
   Username: monitoring_user
   Password: [generate strong password]
   Access: localhost
   ```
4. Save credentials securely

### 2.2 Create Tables via SQL

1. Go to **Databases** → **phpMyAdmin**
2. Select `monitoring_bosowa`
3. Go to **SQL** tab
4. Paste schema from `docs/database.md`:

```sql
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'operasional') NOT NULL DEFAULT 'operasional',
    location ENUM('GENSET', 'TUG_ASSIST') NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type ENUM('IN', 'OUT') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    location ENUM('GENSET', 'TUG_ASSIST') NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_type (type),
    INDEX idx_location (location),
    INDEX idx_created_at (created_at),
    INDEX idx_type_location_date (type, location, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

5. Click **Go**

### 2.3 Seed Default Admin

```sql
INSERT INTO users (email, password, name, role, location) VALUES
('admin@bosowa.co.id',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 'Admin Utama',
 'admin',
 NULL);

-- Password: admin123
```

---

## 3. Backend Deployment

### 3.1 Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node --version  # Should be v20.x.x
npm --version
```

### 3.2 Install PM2

```bash
npm install -g pm2
pm2 --version
```

### 3.3 Deploy Backend

```bash
# Create project directory
mkdir -p /home/monitoring
cd /home/monitoring

# Clone or upload backend files
# Option 1: Git
git clone https://your-repo/monitoring-bosowa-backend.git
cd monitoring-bosowa-backend

# Option 2: Upload via FTP/SFTP
# Upload files to /home/monitoring/monitoring-bosowa-backend

# Install dependencies
npm ci --production

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=4111

DB_HOST=localhost
DB_PORT=3306
DB_NAME=monitoring_bosowa
DB_USER=monitoring_user
DB_PASSWORD=your_database_password_here

JWT_SECRET=your_jwt_secret_min_32_chars_change_this

FRONTEND_URL=https://your-domain.com
COOKIE_SECRET=your_cookie_secret_min_32_chars
EOF

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name monitoring-bosowa-backend

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command output from above
```

### 3.4 Verify Backend

```bash
# Check logs
pm2 logs monitoring-bosowa-backend

# Check status
pm2 status

# Test API
curl http://localhost:4111/health
```

---

## 4. Frontend Deployment

### 4.1 Build Frontend

```bash
# On local machine or server
cd /home/monitoring/monitoring-bosowa-frontend

# Install dependencies
npm ci

# Create .env
cat > .env << EOF
VITE_API_URL=https://your-domain.com/api
VITE_APP_NAME=Monitoring BBM Bosowa
EOF

# Build for production
npm run build

# Output is in 'dist' folder
```

### 4.2 Setup in aaPanel

1. Go to **Website** → **Add Site**
2. Choose:
   - **Domain**: `your-domain.com`
   - **PHP Version**: Pure static (no PHP)
   - **Create Database**: No
3. Click **Submit**

4. Go to **File Manager**
5. Navigate to `/www/wwwroot/your-domain.com`
6. Delete default files (index.html, etc.)
7. Upload frontend build contents:
   - Upload entire `dist` folder contents
   - Or use Git on server:

```bash
cd /www/wwwroot/your-domain.com
rm -rf *
git clone https://your-repo/monitoring-bosowa-frontend.git temp
cp -r temp/dist/* .
rm -rf temp
```

---

## 5. Nginx Configuration

### 5.1 Configure Reverse Proxy

1. Go to **Website** → **Your Domain** → **Settings**
2. Click **Config File**
3. Replace with:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    root /www/wwwroot/your-domain.com;
    index index.html;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /www/server/panel/vhost/cert/your-domain.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API - Reverse Proxy
    location /api {
        proxy_pass http://127.0.0.1:4111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

4. Click **Save**

### 5.2 Setup SSL Certificate

1. Go to **Website** → **Your Domain** → **SSL**
2. Choose **Let's Encrypt**
3. Click **Apply**
4. Wait for certificate issuance

---

## 6. Firewall Configuration

### 6.1 Configure UFW

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow aaPanel (optional, restrict to your IP)
ufw allow from your-ip to any port 8888

# Enable firewall
ufw enable

# Check status
ufw status
```

### 6.2 aaPanel Security

1. Go to **Security** → **Firewall**
2. Add rules:
   - Allow: 80, 443 (all IPs)
   - Allow: 22 (your IP only)
   - Allow: 8888 (your IP only) - for aaPanel access

---

## 7. Monitoring & Logs

### 7.1 PM2 Monitoring

```bash
# Monitor in real-time
pm2 monit

# View logs
pm2 logs monitoring-bosowa-backend

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 7.2 Nginx Logs

```bash
# Access logs
tail -f /www/wwwlogs/your-domain.com.log

# Error logs
tail -f /www/wwwlogs/your-domain.com.error.log
```

### 7.3 MySQL Logs

```bash
# Error log
tail -f /www/server/data/mysql-error.log

# Slow query log
tail -f /www/server/data/mysql-slow.log
```

---

## 8. Backup Strategy

### 8.1 aaPanel Auto Backup

1. Go to **Backup** in aaPanel
2. Add backup plan:
   - **Type**: Database
   - **Database**: monitoring_bosowa
   - **Schedule**: Daily at 3:00 AM
   - **Retention**: 7 days
   - **Location**: Local

### 8.2 Manual Backup

```bash
# Database backup
mysqldump -u monitoring_user -p monitoring_bosowa > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u monitoring_user -p monitoring_bosowa < backup_20240104.sql
```

---

## 9. Update & Maintenance

### 9.1 Update Backend

```bash
cd /home/monitoring/monitoring-bosowa-backend

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build
npm run build

# Restart PM2
pm2 restart monitoring-bosowa-backend

# Or reload (zero downtime)
pm2 reload monitoring-bosowa-backend
```

### 9.2 Update Frontend

```bash
cd /home/monitoring/monitoring-bosowa-frontend

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Copy to web root
rm -rf /www/wwwroot/your-domain.com/*
cp -r dist/* /www/wwwroot/your-domain.com/
```

---

## 10. Troubleshooting

### 10.1 Backend Not Starting

```bash
# Check PM2 logs
pm2 logs monitoring-bosowa-backend --lines 50

# Common issues:
# - Port 4111 already in use
# - Database connection failed
# - Environment variables missing
```

### 10.2 API Returns 401/403

- Check JWT_SECRET in .env
- Check cookie settings (httpOnly, sameSite)
- Verify token expiration

### 10.3 Database Connection Failed

```bash
# Test connection
mysql -u monitoring_user -p -h localhost monitoring_bosowa

# Check credentials in .env
# Verify MySQL is running
systemctl status mysql
```

### 10.4 Frontend Not Loading

- Check Nginx error logs
- Verify build output in dist folder
- Check API_URL in .env

---

## 11. Performance Tuning

### 11.1 MySQL Optimization

```bash
# Edit MySQL config
nano /etc/mysql/my.cnf

# Add/modify:
[mysqld]
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 32M

# Restart MySQL
systemctl restart mysql
```

### 11.2 Nginx Optimization

```nginx
# Add to nginx config:
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
types_hash_max_size 2048;
```

---

## 12. Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] Database password is strong
- [ ] JWT_SECRET is strong (min 32 chars)
- [ ] aaPanel port restricted to specific IP
- [ ] SSH key-based auth enabled
- [ ] Regular backups configured
- [ ] PM2 startup script enabled
- [ ] Nginx security headers set
- [ ] rate limiting configured (optional)

---

## 13. Domain & DNS Setup

### 13.1 Configure DNS

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add A record:
   ```
   Type: A
   Name: @
   Value: your-vps-ip
   TTL: 3600
   ```
3. Add CNAME for www (optional):
   ```
   Type: CNAME
   Name: www
   Value: @
   TTL: 3600
   ```

### 13.2 Propagation Check

```bash
# Check DNS propagation
dig your-domain.com
nslookup your-domain.com
```

---

## 14. Quick Reference

| Service | Port | Command |
|---------|------|---------|
| Backend | 4111 | `pm2 status` |
| MySQL | 3306 | `systemctl status mysql` |
| Nginx | 80/443 | `systemctl status nginx` |
| aaPanel | 8888 | Access via browser |

---

## 15. Support

For issues, refer to:
- Backend docs: `docs/backend.md`
- API docs: `docs/api.md`
- Security docs: `docs/security.md`
