# 🚀 YouTube Video Manager - Docker 部署指南

## 📋 部署概述

本指南将帮助你将 YouTube Video Manager 部署到 Ubuntu 云服务器上，使用 Docker 容器化技术。

## 🎯 部署目标

- **服务器地址**: `http://10.10.146.39/`
- **容器化**: 使用 Docker + Nginx
- **端口**: 80 (HTTP), 443 (HTTPS预留)
- **服务**: 静态文件服务 + API代理支持

## 🛠️ 前置要求

### Ubuntu 服务器要求
- Ubuntu 18.04+ (推荐 20.04 LTS)
- 至少 1GB RAM
- 至少 10GB 磁盘空间
- 开放端口: 80, 443

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+

## 📦 文件结构

```
youtube-video-manager/
├── index.html              # 主应用文件
├── assets/                 # 静态资源目录
│   └── js/                # JavaScript 文件
├── Dockerfile             # Docker 镜像构建文件
├── nginx.conf             # Nginx 配置文件
├── docker-compose.yml     # Docker Compose 配置
├── deploy.sh              # 部署脚本
├── DEPLOY.md              # 本部署文档
└── README.md              # 项目说明
```

## 🚀 快速部署

### 1. 上传项目文件到服务器

```bash
# 在本地打包项目
tar -czf youtube-video-manager.tar.gz youtube-video-manager/

# 上传到服务器
scp youtube-video-manager.tar.gz root@10.10.146.39:/root/

# 在服务器上解压
ssh root@10.10.146.39
cd /root
tar -xzf youtube-video-manager.tar.gz
cd youtube-video-manager
```

### 2. 执行部署脚本

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 构建镜像
./deploy.sh build

# 启动服务
./deploy.sh start

# 查看状态
./deploy.sh status
```

## 🔧 手动部署步骤

### 1. 安装 Docker (如果未安装)

```bash
# 更新包列表
sudo apt update

# 安装必要的包
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# 添加 Docker 仓库
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 构建和启动服务

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 验证部署

```bash
# 检查容器状态
docker ps

# 测试健康检查
curl http://localhost/health

# 测试主页
curl http://localhost
```

## 🌐 访问应用

### 本地访问
- **主页**: http://localhost
- **健康检查**: http://localhost/health

### 网络访问
- **主页**: http://10.10.146.39
- **健康检查**: http://10.10.146.39/health

## 📊 服务管理

### 使用部署脚本

```bash
# 查看帮助
./deploy.sh help

# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看日志
./deploy.sh logs

# 查看状态
./deploy.sh status

# 清理资源
./deploy.sh clean
```

### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口占用
sudo netstat -tlnp | grep :80

# 杀死占用进程
sudo kill -9 <PID>
```

#### 2. 容器启动失败
```bash
# 查看容器日志
docker-compose logs

# 检查容器状态
docker-compose ps -a

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 3. 权限问题
```bash
# 确保脚本有执行权限
chmod +x deploy.sh

# 检查 Docker 权限
docker ps
```

### 日志查看

```bash
# 查看 Nginx 访问日志
docker exec youtube-video-manager tail -f /var/log/nginx/access.log

# 查看 Nginx 错误日志
docker exec youtube-video-manager tail -f /var/log/nginx/error.log

# 查看容器日志
docker-compose logs -f
```

## 🔒 安全配置

### 防火墙设置

```bash
# 安装 UFW
sudo apt install ufw

# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH
sudo ufw allow ssh

# 允许 HTTP 和 HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### SSL/HTTPS 配置 (可选)

如果需要 HTTPS，可以修改 `nginx.conf` 和 `docker-compose.yml`：

```yaml
# 在 docker-compose.yml 中添加
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

## 📈 性能优化

### Nginx 配置优化

- **Gzip 压缩**: 已启用
- **静态文件缓存**: 已配置
- **连接池**: 已优化

### 监控和日志

```bash
# 查看容器资源使用
docker stats youtube-video-manager

# 查看系统资源
htop
df -h
free -h
```

## 🔄 更新部署

### 1. 停止服务
```bash
./deploy.sh stop
```

### 2. 更新代码
```bash
# 上传新代码或拉取更新
git pull origin main
```

### 3. 重新构建和启动
```bash
./deploy.sh build
./deploy.sh start
```

## 📞 支持

如果遇到问题，请检查：

1. **Docker 服务状态**: `sudo systemctl status docker`
2. **容器日志**: `docker-compose logs`
3. **网络连接**: `curl http://localhost/health`
4. **防火墙设置**: `sudo ufw status`

## 🎉 部署完成

部署成功后，你可以通过以下地址访问应用：

- **本地**: http://localhost
- **网络**: http://10.10.146.39

应用将提供：
- ✅ YouTube 视频搜索和管理
- ✅ 评论获取和导出
- ✅ 历史记录管理
- ✅ 批量操作功能
- ✅ 响应式设计

祝你使用愉快！🎊
