# 🚀 云服务器快速部署指南

## 📋 前置要求

- 一台云服务器（Ubuntu 20.04+ / CentOS 7+ / Debian 10+）
- SSH 访问权限
- 至少 1GB 内存，10GB 磁盘空间

## 🔧 步骤1：服务器准备

### 1.1 连接服务器

```bash
ssh user@your-server-ip
```

### 1.2 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.3 安装Docker

```bash
# 一键安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组（避免每次都用sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使权限生效
newgrp docker

# 验证安装
docker --version
```

### 1.4 安装Docker Compose

```bash
# 下载最新版本
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 设置执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

## 📦 步骤2：上传项目文件

### 方法1：使用SCP（推荐）

在**本地电脑**执行：

```bash
# 进入项目目录
cd /path/to/youtube-video-manager

# 上传整个项目到服务器
scp -r . user@your-server-ip:/home/user/youtube-video-manager/

# 或只上传必要文件
scp -r index.html config.json api-key-config.js Dockerfile docker-compose.yml nginx.conf assets/ user@your-server-ip:/home/user/youtube-video-manager/
```

### 方法2：使用Git（如果项目在Git仓库）

在**服务器**上执行：

```bash
# 安装Git
sudo apt install git -y  # Ubuntu/Debian
# 或
sudo yum install git -y  # CentOS

# 克隆项目
cd /home/user
git clone https://github.com/your-repo/youtube-video-manager.git
cd youtube-video-manager
```

### 方法3：使用rsync（推荐，支持增量更新）

在**本地电脑**执行：

```bash
rsync -avz --progress \
    index.html \
    config.json \
    api-key-config.js \
    Dockerfile \
    docker-compose.yml \
    nginx.conf \
    assets/ \
    update-docker.sh \
    user@your-server-ip:/home/user/youtube-video-manager/
```

## 🔑 步骤3：配置API密钥

在**服务器**上执行：

```bash
# 进入项目目录
cd /home/user/youtube-video-manager

# 编辑API密钥配置文件
nano api-key-config.js
# 或使用vi
vi api-key-config.js
```

将 `YOUR_API_KEY_HERE` 替换为您的真实YouTube API密钥：

```javascript
window.EMBEDDED_API_KEYS = [
    'AIzaSy您的真实API密钥',
];
```

保存并退出（nano: Ctrl+X, Y, Enter | vi: Esc, :wq, Enter）

## 🚀 步骤4：部署

### 4.1 创建必要目录

```bash
mkdir -p logs
```

### 4.2 构建并启动容器

```bash
# 构建Docker镜像
docker-compose build --no-cache

# 启动容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4.3 验证部署

```bash
# 检查容器是否运行
docker ps | grep youtube-video-manager

# 测试本地访问
curl http://localhost:8081/health

# 应该返回 "healthy"
```

## 🔥 步骤5：配置防火墙

### Ubuntu/Debian (UFW)

```bash
# 安装UFW
sudo apt install ufw -y

# 允许SSH（重要！先允许SSH，避免被锁在外面）
sudo ufw allow ssh
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口
sudo ufw allow 8081/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### CentOS/RHEL (Firewalld)

```bash
# 允许HTTP和HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8081/tcp

# 重新加载防火墙
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 🌐 步骤6：访问应用

### 方式1：直接访问（IP地址）

```
http://your-server-ip:8081
```

### 方式2：配置域名（可选）

#### 6.1 配置DNS

在您的域名提供商处添加A记录：
```
类型: A
名称: youtube-manager (或您想要的子域名)
值: 您的服务器IP地址
TTL: 300
```

#### 6.2 安装Nginx反向代理

```bash
# 安装Nginx
sudo apt install nginx -y  # Ubuntu/Debian
# 或
sudo yum install nginx -y  # CentOS

# 创建配置文件
sudo nano /etc/nginx/sites-available/youtube-manager
```

配置文件内容：

```nginx
server {
    listen 80;
    server_name youtube-manager.yourdomain.com;  # 替换为您的域名

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
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/youtube-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# CentOS/RHEL
sudo cp /etc/nginx/sites-available/youtube-manager /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 步骤7：配置SSL证书（可选但推荐）

### 使用Let's Encrypt（免费）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu/Debian
# 或
sudo yum install certbot python3-certbot-nginx -y  # CentOS

# 获取SSL证书
sudo certbot --nginx -d youtube-manager.yourdomain.com

# 自动续期（添加到crontab）
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 步骤8：验证部署

1. **访问应用**：打开浏览器访问 `http://your-server-ip:8081` 或您的域名
2. **测试搜索**：尝试搜索一个视频
3. **测试评论**：点击"获取评论"按钮
4. **检查控制台**：打开浏览器开发者工具（F12），查看是否有错误

## 🛠️ 常用管理命令

```bash
# 进入项目目录
cd /home/user/youtube-video-manager

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs --tail=100

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d

# 查看资源使用
docker stats youtube-video-manager

# 进入容器
docker exec -it youtube-video-manager sh

# 更新应用（使用更新脚本）
./update-docker.sh --no-cache
```

## 🔄 更新应用

### 方法1：使用更新脚本（推荐）

```bash
# 上传更新的文件到服务器后
cd /home/user/youtube-video-manager
./update-docker.sh --no-cache
```

### 方法2：手动更新

```bash
cd /home/user/youtube-video-manager
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🚨 故障排除

### 问题1：无法访问

```bash
# 检查容器状态
docker-compose ps

# 检查端口监听
sudo netstat -tlnp | grep 8081

# 检查防火墙
sudo ufw status  # Ubuntu/Debian
sudo firewall-cmd --list-all  # CentOS

# 检查日志
docker-compose logs
```

### 问题2：容器无法启动

```bash
# 查看详细日志
docker-compose logs -f

# 检查Docker服务
sudo systemctl status docker

# 检查磁盘空间
df -h
```

### 问题3：API密钥问题

```bash
# 检查API密钥配置
cat api-key-config.js

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

## 📝 部署检查清单

- [ ] Docker已安装并运行
- [ ] Docker Compose已安装
- [ ] 项目文件已上传到服务器
- [ ] API密钥已配置在 `api-key-config.js`
- [ ] 防火墙已配置（开放8081端口）
- [ ] 容器已启动并运行
- [ ] 可以通过IP地址访问应用
- [ ] （可选）域名已配置
- [ ] （可选）SSL证书已配置

## 🎯 快速部署命令（一键执行）

```bash
# 在服务器上执行以下命令（需要先上传文件）
cd /home/user/youtube-video-manager
mkdir -p logs
chmod +x update-docker.sh
docker-compose build --no-cache
docker-compose up -d
docker-compose ps
```

## 📞 需要帮助？

如果遇到问题，请提供：
1. 服务器操作系统版本：`cat /etc/os-release`
2. Docker版本：`docker --version`
3. 错误日志：`docker-compose logs`
4. 容器状态：`docker-compose ps`

---

**部署完成后，您可以通过以下地址访问应用：**
- IP访问：`http://your-server-ip:8081`
- 域名访问：`http://youtube-manager.yourdomain.com`

**祝您部署顺利！** 🎉


