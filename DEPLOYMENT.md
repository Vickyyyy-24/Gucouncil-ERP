# Dynamic CRM System - Deployment Guide

## 🚀 Production Deployment

This guide will help you deploy the Dynamic CRM System to production with all features working correctly.

## 📋 Prerequisites

### Server Requirements
- **Node.js**: v16 or higher
- **PostgreSQL**: v12 or higher
- **Nginx**: For reverse proxy (recommended)
- **SSL Certificate**: For HTTPS
- **Biometric Scanner**: For attendance features

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB minimum for application and uploads
- **Network**: Stable internet connection for biometric scanner

## 🔧 Installation Steps

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repository-url>
cd dynamic-crm-system

# Install dependencies
npm install
cd client && npm install && cd ..
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb dynamic_crm

# Run database migrations
psql -U postgres -d dynamic_crm < server/database/schema.sql

# Create database user
createuser -P crm_user
# Enter password when prompted
```

### 3. Environment Configuration

#### Backend Environment (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://crm_user:your_password@localhost:5432/dynamic_crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_PATH=./server/uploads
MAX_FILE_SIZE=10485760

# Client Configuration
CLIENT_URL=https://yourdomain.com

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Biometric Scanner Configuration
BIOMETRIC_DEVICE_PORT=/dev/ttyUSB0
BIOMETRIC_BAUD_RATE=9600
```

#### Frontend Environment (client/.env.local)
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_NAME=Dynamic CRM System
```

### 4. Build the Application
```bash
# Build the frontend
cd client
npm run build
cd ..

# The build files will be in client/.next
```

### 5. Setup Nginx Configuration

Create `/etc/nginx/sites-available/dynamic-crm`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Static files
    location /uploads/ {
        alias /path/to/your/project/server/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dynamic-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: './server/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'crm-frontend',
      script: './client/node_modules/.bin/next',
      args: 'start',
      cwd: './client',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 7. Setup Firewall
```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 8. Configure Biometric Scanner
```bash
# Install required drivers (example for common scanners)
sudo apt-get update
sudo apt-get install libusb-1.0-0-dev

# Set permissions for USB device
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyUSB0

# Add to crontab for persistent permissions
@reboot sudo chmod 666 /dev/ttyUSB0
```

## 🔐 Security Configuration

### 1. Database Security
```sql
-- Create limited user for application
CREATE USER crm_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE dynamic_crm TO crm_app;
GRANT USAGE ON SCHEMA public TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_app;
```

### 2. Application Security
```bash
# Install security packages
npm install helmet express-rate-limit

# Update server.js to include security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### 3. SSL Configuration
```bash
# Install Certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring and Logging

### 1. Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 2. Database Monitoring
```sql
-- Create monitoring views
CREATE VIEW attendance_summary AS
SELECT 
    u.council_id,
    up.name,
    up.committee_name,
    COUNT(a.id) as total_days,
    SUM(a.total_hours) as total_hours
FROM users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN attendance a ON u.id = a.user_id
WHERE a.punch_out IS NOT NULL
GROUP BY u.id, up.name, up.committee_name;
```

### 3. System Monitoring
```bash
# Install monitoring tools
sudo apt-get install htop iotop nethogs

# Setup basic monitoring script
cat > /usr/local/bin/crm-monitor.sh << 'EOF'
#!/bin/bash
echo "=== CRM System Status ==="
echo "Memory Usage:"
free -h
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "Process Status:"
pm2 status
echo ""
echo "Database Connections:"
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='dynamic_crm';"
EOF

chmod +x /usr/local/bin/crm-monitor.sh
```

## 🔄 Backup and Recovery

### 1. Database Backup
```bash
# Create backup script
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/crm"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U postgres dynamic_crm > $BACKUP_DIR/crm_backup_$DATE.sql

# Compress the backup
gzip $BACKUP_DIR/crm_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "crm_backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_DIR/crm_backup_$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-db.sh" | crontab -
```

### 2. File Backup
```bash
# Create file backup script
cat > /usr/local/bin/backup-files.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/crm/files"
mkdir -p $BACKUP_DIR

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /path/to/your/project/server/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +7 -delete

echo "File backup completed: $BACKUP_DIR/uploads_backup_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-files.sh

# Add to crontab (daily at 3 AM)
echo "0 3 * * * /usr/local/bin/backup-files.sh" | crontab -
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -U postgres -d dynamic_crm -c "SELECT 1;"
   ```

2. **File Upload Issues**
   ```bash
   # Check upload directory permissions
   ls -la /path/to/your/project/server/uploads/
   
   # Fix permissions
   sudo chown -R $USER:$USER /path/to/your/project/server/uploads/
   chmod -R 755 /path/to/your/project/server/uploads/
   ```

3. **Biometric Scanner Not Working**
   ```bash
   # Check device connection
   lsusb
   dmesg | grep tty
   
   # Test serial communication
   screen /dev/ttyUSB0 9600
   ```

4. **PM2 Process Issues**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Restart processes
   pm2 restart all
   
   # Check process status
   pm2 status
   ```

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_users_council_id ON users(council_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_work_reports_user_id ON work_reports(user_id);
CREATE INDEX idx_leave_applications_user_id ON leave_applications(user_id);
```

### 2. Application Optimization
```bash
# Enable compression
npm install compression

# Update server.js
const compression = require('compression');
app.use(compression());

# Enable caching
app.use(express.static('public', { maxAge: '1d' }));
```

### 3. System Optimization
```bash
# Increase file descriptors
echo "fs.file-max = 65536" >> /etc/sysctl.conf
sysctl -p

# Increase process limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

## 🔧 Maintenance

### Regular Maintenance Tasks
1. **Daily**: Check logs, monitor performance
2. **Weekly**: Review security updates, backup verification
3. **Monthly**: Database optimization, security audit
4. **Quarterly**: Full system review, capacity planning

### Update Procedures
```bash
# Update application
pm2 stop all
git pull origin main
npm install
cd client && npm install && npm run build && cd ..
pm2 start all

# Update system
sudo apt-get update
sudo apt-get upgrade
```

## 📞 Support

For production support:
1. Check application logs: `pm2 logs`
2. Check system logs: `journalctl -u nginx`
3. Check database logs: `/var/log/postgresql/`
4. Contact support team with error details

## 🎯 Success Metrics

After deployment, monitor these metrics:
- **System Uptime**: > 99.9%
- **Response Time**: < 200ms
- **Error Rate**: < 0.1%
- **Database Performance**: < 50ms query time
- **User Satisfaction**: > 95%

This deployment guide ensures your Dynamic CRM System is production-ready with proper security, monitoring, and maintenance procedures.