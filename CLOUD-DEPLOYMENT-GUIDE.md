# YouTube视频管理器 v2.1.0 云服务器部署指南

## 📋 目录
- [服务器要求](#服务器要求)
- [部署步骤](#部署步骤)
- [域名配置](#域名配置)
- [SSL证书配置](#ssl证书配置)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)

## 🖥️ 服务器要求

### 最低配置
- **CPU**: 1核心
- **内存**: 1GB RAM
- **存储**: 10GB SSD
- **网络**: 1Mbps带宽
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+

### 推荐配置
- **CPU**: 2核心
- **内存**: 2GB RAM
- **存储**: 20GB SSD
- **网络**: 5Mbps带宽
- **操作系统**: Ubuntu 22.04 LTS

## 🚀 部署步骤

### 1. 服务器准备

#### 1.1 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 1.2 安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER
```

#### 1.3 安装Docker Compose
```bash
# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 设置执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 2. 项目部署

#### 2.1 上传项目文件
```bash
# 方法1: 使用scp上传
scp -r /path/to/youtube-video-manager user@your-server-ip:/home/user/

# 方法2: 使用git克隆
git clone https://github.com/your-repo/youtube-video-manager.git
cd youtube-video-manager
```

#### 2.2 设置权限
```bash
# 设置部署脚本权限
chmod +x deploy-v2.1.sh

# 创建日志目录
mkdir -p logs
```

#### 2.3 执行部署
```bash
# 运行部署脚本
./deploy-v2.1.sh
```

### 3. 防火墙配置

#### 3.1 Ubuntu/Debian (UFW)
```bash
# 安装UFW
sudo apt install ufw -y

# 允许SSH
sudo ufw allow ssh

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8081/tcp

# 启用防火墙
sudo ufw enable
```

#### 3.2 CentOS/RHEL (Firewalld)
```bash
# 允许HTTP和HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8081/tcp

# 重新加载防火墙
sudo firewall-cmd --reload
```

## 🌐 域名配置

### 1. DNS设置
在您的域名提供商处添加A记录：
```
类型: A
名称: youtube-manager (或您想要的子域名)
值: 您的服务器IP地址
TTL: 300
```

### 2. Nginx反向代理 (可选)
如果需要使用80/443端口，可以配置Nginx反向代理：

```bash
# 安装Nginx
sudo apt install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/youtube-manager
```

配置文件内容：
```nginx
server {
    listen 80;
    server_name youtube-manager.yourdomain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/youtube-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL证书配置

### 1. 使用Let's Encrypt (免费)
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d youtube-manager.yourdomain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 使用Docker SSL (自签名)
```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/private.key \
    -out ssl/certificate.crt

# 更新docker-compose.yml添加SSL配置
```

## 📊 监控和维护

### 1. 服务状态检查
```bash
# 检查容器状态
docker ps

# 查看日志
docker logs youtube-video-manager

# 查看资源使用
docker stats youtube-video-manager
```

### 2. 自动重启脚本
创建监控脚本：
```bash
#!/bin/bash
# monitor.sh
if ! docker ps | grep -q youtube-video-manager; then
    echo "Container is down, restarting..."
    docker-compose restart
fi
```

添加到crontab：
```bash
# 每5分钟检查一次
*/5 * * * * /path/to/monitor.sh
```

### 3. 日志轮转
```bash
# 安装logrotate
sudo apt install logrotate -y

# 创建配置文件
sudo nano /etc/logrotate.d/youtube-manager
```

配置内容：
```
/home/user/youtube-video-manager/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart youtube-video-manager
    endscript
}
```

## 🔧 故障排除

### 1. 常见问题

#### 容器无法启动
```bash
# 查看详细日志
docker logs youtube-video-manager

# 检查端口占用
sudo netstat -tlnp | grep :8081

# 检查Docker服务
sudo systemctl status docker
```

#### 无法访问网站
```bash
# 检查防火墙
sudo ufw status

# 检查端口监听
sudo netstat -tlnp | grep :8081

# 测试本地访问
curl http://localhost:8081
```

#### 内存不足
```bash
# 查看内存使用
free -h
docker stats

# 清理Docker缓存
docker system prune -a
```

### 2. 性能优化

#### 启用Gzip压缩
在nginx.conf中添加：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

#### 设置缓存
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📝 管理命令

### 常用Docker命令
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新镜像
docker-compose pull
docker-compose up -d

# 清理系统
docker system prune -a
```

### 备份和恢复
```bash
# 备份数据
tar -czf youtube-manager-backup-$(date +%Y%m%d).tar.gz logs/ config.json

# 恢复数据
tar -xzf youtube-manager-backup-20240101.tar.gz
```

## 🆘 技术支持

如果遇到问题，请提供以下信息：
1. 服务器操作系统版本
2. Docker和Docker Compose版本
3. 错误日志
4. 网络配置信息

---

**部署完成后，您可以通过以下地址访问应用：**
- 本地访问: `http://your-server-ip:8081`
- 域名访问: `http://youtube-manager.yourdomain.com`

**祝您使用愉快！** 🎉




