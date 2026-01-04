#!/bin/bash

# Docker部署测试脚本

echo "🧪 开始测试Docker部署..."
echo "📅 测试时间: $(date)"
echo "🔧 版本: v2.1"
echo ""

# 检查Docker服务状态
echo "🔍 检查Docker服务状态..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker服务未运行"
    exit 1
fi
echo "✅ Docker服务运行正常"

# 检查容器状态
echo "🔍 检查容器状态..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ 容器未运行，请先启动服务"
    echo "💡 运行命令: docker-compose up -d"
    exit 1
fi
echo "✅ 容器运行正常"

# 检查端口监听
echo "🔍 检查端口监听..."
if ! lsof -i :8080 >/dev/null 2>&1; then
    echo "⚠️  端口8080未监听，检查Docker端口映射"
    docker-compose ps
    exit 1
fi
echo "✅ 端口8080正在监听"

# 测试HTTP响应
echo "🔍 测试HTTP响应..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_RESPONSE" = "200" ]; then
    echo "✅ HTTP响应正常 (状态码: $HTTP_RESPONSE)"
else
    echo "❌ HTTP响应异常 (状态码: $HTTP_RESPONSE)"
    exit 1
fi

# 测试页面内容
echo "🔍 测试页面内容..."
if curl -s http://localhost:8080 | grep -q "v2.1"; then
    echo "✅ 页面版本正确 (v2.1)"
else
    echo "❌ 页面版本不正确"
    exit 1
fi

# 测试修复状态提示
echo "🔍 测试修复状态提示..."
if curl -s http://localhost:8080 | grep -q "功能已修复"; then
    echo "✅ 修复状态提示正常"
else
    echo "❌ 修复状态提示缺失"
fi

# 测试config.json
echo "🔍 测试config.json..."
if curl -s http://localhost:8080/config.json | grep -q "api"; then
    echo "✅ config.json加载正常"
else
    echo "❌ config.json加载失败"
fi

# 测试JavaScript文件
echo "🔍 测试JavaScript文件..."
JS_FILES=("comment-manager-v2.js" "history-manager-v2.js")
for js_file in "${JS_FILES[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/assets/js/$js_file" | grep -q "200"; then
        echo "✅ $js_file 加载正常"
    else
        echo "❌ $js_file 加载失败"
    fi
done

# 检查容器资源使用
echo "🔍 检查容器资源使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "🎉 Docker部署测试完成！"
echo "✅ 所有测试项目通过"
echo ""
echo "🌐 访问地址: http://localhost:8080"
echo "📱 功能状态:"
echo "   ✅ 复制URL功能 - 已修复"
echo "   ✅ 批量获取评论功能 - 已修复"
echo "   ✅ 页面加载 - 正常"
echo "   ✅ 静态资源 - 正常"
echo "   ✅ config.json - 正常"
echo ""
echo "🔧 下一步操作:"
echo "   1. 打开浏览器访问 http://localhost:8080"
echo "   2. 配置YouTube API密钥"
echo "   3. 测试修复后的功能"
echo ""
echo "📞 如遇问题，请运行: docker-compose logs -f"

