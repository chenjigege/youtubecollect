# 🚀 云服务器Docker更新指南

## 📋 更新前准备

### 1. 检查当前状态

```bash
# 进入项目目录
cd /path/to/youtube-video-manager

# 查看当前容器状态
docker-compose ps

# 查看当前日志
docker-compose logs --tail=50
```

### 2. 备份重要数据

```bash
# 备份配置文件
cp config.json config.json.bak
cp api-key-config.js api-key-config.js.bak
cp docker-compose.yml docker-compose.yml.bak
```

## 🔄 更新方法

### 方法1：使用更新脚本（推荐）

```bash
# 1. 上传更新脚本到服务器
scp update-docker.sh user@your-server:/path/to/youtube-video-manager/

# 2. 上传更新的文件（如果需要）
scp -r index.html assets/ config.json api-key-config.js Dockerfile docker-compose.yml user@your-server:/path/to/youtube-video-manager/

# 3. SSH登录服务器
ssh user@your-server

# 4. 进入项目目录
cd /path/to/youtube-video-manager

# 5. 设置执行权限
chmod +x update-docker.sh

# 6. 运行更新脚本
./update-docker.sh

# 或使用选项：
./update-docker.sh --no-cache    # 不使用缓存构建
./update-docker.sh --cleanup     # 清理旧镜像
```

### 方法2：手动更新

```bash
# 1. SSH登录服务器
ssh user@your-server

# 2. 进入项目目录
cd /path/to/youtube-video-manager

# 3. 停止当前容器
docker-compose down

# 4. 备份当前配置（如果需要）
mkdir -p backups
cp config.json api-key-config.js backups/

# 5. 上传更新的文件（使用scp或git pull）
# 如果使用git：
git pull origin main

# 如果使用scp，在本地执行：
# scp -r index.html assets/ config.json api-key-config.js Dockerfile docker-compose.yml user@your-server:/path/to/youtube-video-manager/

# 6. 重新构建镜像
docker-compose build --no-cache

# 7. 启动新容器
docker-compose up -d

# 8. 检查服务状态
docker-compose ps
docker-compose logs -f
```

### 方法3：使用Git自动更新（推荐生产环境）

```bash
# 1. 在服务器上设置Git仓库
cd /path/to/youtube-video-manager
git init
git remote add origin https://github.com/your-repo/youtube-video-manager.git

# 2. 创建更新脚本
cat > update.sh << 'EOF'
#!/bin/bash
set -e
cd /path/to/youtube-video-manager
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose ps
EOF

chmod +x update.sh

# 3. 运行更新
./update.sh
```

## 📤 从本地更新到服务器

### 步骤1：打包更新文件

在本地项目目录执行：

```bash
# 创建更新包
tar -czf update.tar.gz \
    index.html \
    config.json \
    api-key-config.js \
    Dockerfile \
    docker-compose.yml \
    nginx.conf \
    assets/ \
    update-docker.sh

# 或使用zip
zip -r update.zip \
    index.html \
    config.json \
    api-key-config.js \
    Dockerfile \
    docker-compose.yml \
    nginx.conf \
    assets/ \
    update-docker.sh
```

### 步骤2：上传到服务器

```bash
# 上传更新包
scp update.tar.gz user@your-server:/path/to/youtube-video-manager/

# 或使用rsync（推荐，支持增量更新）
rsync -avz --progress \
    index.html \
    config.json \
    api-key-config.js \
    Dockerfile \
    docker-compose.yml \
    nginx.conf \
    assets/ \
    update-docker.sh \
    user@your-server:/path/to/youtube-video-manager/
```

### 步骤3：在服务器上解压和更新

```bash
# SSH登录服务器
ssh user@your-server

# 进入项目目录
cd /path/to/youtube-video-manager

# 解压更新包
tar -xzf update.tar.gz

# 或解压zip
unzip update.zip

# 运行更新脚本
chmod +x update-docker.sh
./update-docker.sh
```

## 🔍 更新后验证

### 1. 检查容器状态

```bash
# 查看容器状态
docker-compose ps

# 应该看到容器状态为 "Up"
```

### 2. 检查服务响应

```bash
# 本地测试
curl http://localhost:8081/health

# 应该返回 "healthy"
```

### 3. 查看日志

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近50行日志
docker-compose logs --tail=50
```

### 4. 检查功能

访问应用并测试：
- 搜索功能是否正常
- 评论获取是否正常
- API密钥是否正常工作

## 🔙 回滚操作

如果更新后出现问题，可以回滚：

```bash
# 使用更新脚本回滚
./update-docker.sh rollback

# 或手动回滚
docker-compose down
docker-compose up -d --force-recreate
```

## 📊 常用管理命令

```bash
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

# 查看镜像
docker images | grep youtube-video-manager
```

## ⚠️ 注意事项

1. **API密钥保护**：更新时确保 `api-key-config.js` 文件中的API密钥正确
2. **配置文件备份**：更新前务必备份 `config.json` 和 `api-key-config.js`
3. **数据持久化**：如果需要保留用户数据，确保 `logs/` 目录已挂载
4. **端口占用**：确保8081端口未被占用
5. **磁盘空间**：确保有足够的磁盘空间用于构建镜像

## 🚨 故障排除

### 问题1：构建失败

```bash
# 清理Docker缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

### 问题2：容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep 8081

# 检查Docker服务
systemctl status docker
```

### 问题3：服务无法访问

```bash
# 检查防火墙
ufw status
# 或
firewall-cmd --list-all

# 检查容器日志
docker logs youtube-video-manager
```

## 📝 更新清单

- [ ] 备份当前配置和数据
- [ ] 停止当前容器
- [ ] 上传更新的文件
- [ ] 重新构建镜像
- [ ] 启动新容器
- [ ] 验证服务状态
- [ ] 测试功能
- [ ] 监控日志

## 🎯 快速更新命令

```bash
# 一键更新（使用脚本）
./update-docker.sh --no-cache

# 或手动更新（快速）
docker-compose down && \
docker-compose build --no-cache && \
docker-compose up -d && \
docker-compose ps
```



