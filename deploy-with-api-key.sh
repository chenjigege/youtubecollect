#!/bin/bash

# YouTube视频管理器 - Docker部署脚本（带API密钥）
# 使用说明：在运行此脚本前，请先编辑 api-key-config.js 文件，填入您的API密钥

set -e

echo "🐳 YouTube视频管理器 - Docker部署脚本"
echo "=========================================="
echo ""

# 检查是否已配置API密钥
if grep -q "YOUR_API_KEY_HERE" api-key-config.js 2>/dev/null; then
    echo "⚠️  警告：检测到未配置的API密钥占位符"
    echo ""
    echo "请先编辑 api-key-config.js 文件，填入您的YouTube API密钥："
    echo "  1. 打开 api-key-config.js"
    echo "  2. 将 'YOUR_API_KEY_HERE' 替换为您的真实API密钥"
    echo "  3. 保存文件后重新运行此脚本"
    echo ""
    read -p "是否继续部署（不推荐）？(y/N): " continue_deploy
    if [[ ! $continue_deploy =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误：Docker未运行，请先启动Docker Desktop"
    exit 1
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

# 构建镜像
echo "🔨 构建Docker镜像..."
docker-compose build --no-cache

# 启动容器
echo "🚀 启动容器..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 检查服务状态
if curl -f http://localhost:8081/health > /dev/null 2>&1; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "📋 服务信息："
    echo "   - 访问地址: http://localhost:8081"
    echo "   - 健康检查: http://localhost:8081/health"
    echo ""
    echo "🔍 查看日志: docker-compose logs -f"
    echo "🛑 停止服务: docker-compose down"
    echo ""
    
    # 打开浏览器
    if command -v open > /dev/null; then
        read -p "是否在浏览器中打开？(Y/n): " open_browser
        if [[ ! $open_browser =~ ^[Nn]$ ]]; then
            open http://localhost:8081
        fi
    fi
else
    echo ""
    echo "⚠️  警告：服务可能未正常启动"
    echo "请检查日志: docker-compose logs"
    exit 1
fi



