# YouTube视频管理器 v2.1 部署指南

## 🎯 版本信息

- **版本**: v2.1
- **发布日期**: 2025-08-29
- **主要修复**: 复制URL和批量获取评论功能
- **状态**: ✅ 已修复，可正常使用

## 🚀 快速部署

### 方法1: 使用部署脚本 (推荐)

```bash
# 1. 解压部署包
tar -xzf youtube-video-manager-v2.1.tar.gz
cd youtube-video-manager-v2.1

# 2. 运行部署脚本
./deploy-v2.1.sh
```

### 方法2: 手动部署

```bash
# 1. 解压部署包
tar -xzf youtube-video-manager-v2.1.tar.gz
cd youtube-video-manager-v2.1

# 2. 构建并启动Docker容器
docker-compose up -d --build

# 3. 检查服务状态
docker-compose ps
```

## 📋 系统要求

- **操作系统**: Linux, macOS, Windows (支持Docker)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 最少2GB RAM
- **存储**: 最少1GB可用空间

## 🔧 部署前准备

### 1. 安装Docker

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

**CentOS/RHEL:**
```bash
sudo yum install docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

**macOS:**
```bash
# 下载并安装 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

**Windows:**
```bash
# 下载并安装 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### 2. 验证Docker安装

```bash
docker --version
docker-compose --version
```

## 📁 项目结构

```
youtube-video-manager-v2.1/
├── assets/                    # 静态资源
│   └── js/                   # JavaScript文件
│       ├── comment-manager-v2.js    # 评论管理器
│       ├── history-manager-v2.js    # 历史记录管理器
│       └── ...
├── index.html                # 主页面 (已修复)
├── docker-compose.yml        # Docker编排文件
├── Dockerfile                # Docker镜像配置
├── nginx.conf                # Nginx配置
├── deploy-v2.1.sh           # 部署脚本
├── config.json               # 配置文件
└── README.md                 # 说明文档
```

## 🚀 部署步骤

### 步骤1: 解压部署包

```bash
tar -xzf youtube-video-manager-v2.1.tar.gz
cd youtube-video-manager-v2.1
```

### 步骤2: 配置环境

检查 `config.json` 文件，确保配置正确：

```json
{
  "api": {
    "maxVideosPerSearch": 50,
    "maxCommentsPerVideo": 100
  },
  "server": {
    "port": 80,
    "host": "0.0.0.0"
  }
}
```

### 步骤3: 启动服务

```bash
# 使用部署脚本 (推荐)
./deploy-v2.1.sh

# 或手动启动
docker-compose up -d --build
```

### 步骤4: 验证部署

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查端口
lsof -i :80
```

## 🌐 访问应用

- **本地访问**: http://localhost
- **局域网访问**: http://[服务器IP]
- **公网访问**: http://[公网IP] (需要配置防火墙)

## 📱 功能特性

### ✅ 已修复功能

1. **复制URL功能**
   - 选择视频后点击"复制URL"按钮
   - 支持搜索结果页面和视频库页面
   - 自动复制到剪贴板

2. **批量获取评论功能**
   - 选择多个视频后点击"批量获取评论"按钮
   - 专门的搜索结果处理函数
   - 进度显示和错误处理

### 🚀 其他功能

- 智能视频搜索和筛选
- 评论数据导出 (JSON/CSV/TXT/HTML)
- 历史记录管理
- 数据统计和分析
- 响应式用户界面

## 🔧 管理命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 容器管理

```bash
# 进入容器
docker-compose exec web bash

# 查看容器资源使用
docker stats

# 清理未使用的资源
docker system prune -f
```

## 🐛 故障排除

### 常见问题

1. **端口80被占用**
   ```bash
   # 查看端口占用
   lsof -i :80
   
   # 修改docker-compose.yml中的端口映射
   ports:
     - "8080:80"  # 改为8080端口
   ```

2. **Docker权限问题**
   ```bash
   # 添加用户到docker组
   sudo usermod -aG docker $USER
   
   # 重新登录或重启系统
   ```

3. **镜像构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a -f
   
   # 重新构建
   docker-compose build --no-cache
   ```

### 日志查看

```bash
# 查看应用日志
docker-compose logs -f web

# 查看Nginx日志
docker-compose logs -f nginx

# 查看所有日志
docker-compose logs -f
```

## 📞 技术支持

### 获取帮助

1. **查看日志**: `docker-compose logs -f`
2. **检查状态**: `docker-compose ps`
3. **重启服务**: `docker-compose restart`
4. **查看文档**: 阅读 `README.md` 和 `CHANGELOG.md`

### 联系信息

- **项目地址**: 当前部署目录
- **文档**: `README.md`, `CHANGELOG.md`
- **测试页面**: `test-functions.html`

## 📝 更新日志

详细更新内容请查看 `CHANGELOG.md` 文件。

## 🎉 部署完成

恭喜！YouTube视频管理器v2.1已成功部署。

**下一步操作:**
1. 打开浏览器访问 http://localhost
2. 在设置中配置YouTube API密钥
3. 开始使用修复后的功能

**功能验证:**
- 搜索视频并选择
- 测试复制URL功能
- 测试批量获取评论功能

如有问题，请查看Docker日志或联系技术支持。


