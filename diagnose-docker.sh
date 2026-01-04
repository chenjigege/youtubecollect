#!/bin/bash

echo "=== Docker 诊断脚本 ==="
echo ""

echo "1. 检查 Docker 服务状态..."
if docker --version > /dev/null 2>&1; then
    echo "✓ Docker 已安装: $(docker --version)"
else
    echo "✗ Docker 未安装或无法访问"
    exit 1
fi

echo ""
echo "2. 检查容器状态..."
if docker ps | grep -q youtube-video-manager; then
    echo "✓ 容器正在运行"
    docker ps | grep youtube-video-manager
else
    echo "✗ 容器未运行"
    echo "尝试启动容器..."
    docker-compose up -d
fi

echo ""
echo "3. 检查容器健康状态..."
HEALTH=$(docker inspect youtube-video-manager --format='{{.State.Health.Status}}' 2>/dev/null)
if [ "$HEALTH" = "healthy" ]; then
    echo "✓ 容器健康状态: $HEALTH"
elif [ "$HEALTH" = "unhealthy" ]; then
    echo "✗ 容器健康状态: $HEALTH"
    echo "查看详细日志..."
    docker logs youtube-video-manager --tail 20
else
    echo "⚠ 容器健康状态: $HEALTH"
fi

echo ""
echo "4. 检查端口监听..."
if netstat -an 2>/dev/null | grep -q "\.8081.*LISTEN" || lsof -i :8081 > /dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":8081"; then
    echo "✓ 端口 8081 正在监听"
else
    echo "✗ 端口 8081 未监听"
fi

echo ""
echo "5. 测试本地访问..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q "200"; then
    echo "✓ 本地访问成功 (HTTP 200)"
else
    echo "✗ 本地访问失败"
    echo "尝试访问..."
    curl -I http://localhost:8081 2>&1 | head -5
fi

echo ""
echo "6. 检查容器内部服务..."
if docker exec youtube-video-manager curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    echo "✓ 容器内部服务正常"
else
    echo "✗ 容器内部服务异常"
fi

echo ""
echo "7. 检查网络配置..."
NETWORK=$(docker inspect youtube-video-manager --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null)
if [ -n "$NETWORK" ]; then
    echo "✓ 容器网络: $NETWORK"
    IP=$(docker inspect youtube-video-manager --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
    echo "  容器IP: $IP"
else
    echo "✗ 无法获取网络信息"
fi

echo ""
echo "8. 检查最近的错误日志..."
if [ -f "./logs/error.log" ]; then
    echo "最近的错误:"
    tail -5 ./logs/error.log | grep -i error || echo "  无错误"
else
    echo "⚠ 错误日志文件不存在"
fi

echo ""
echo "=== 诊断完成 ==="
echo ""
echo "如果无法访问，请尝试:"
echo "1. 重启容器: docker-compose restart"
echo "2. 重新构建并启动: docker-compose up -d --build"
echo "3. 检查防火墙设置"
echo "4. 尝试从其他设备访问: http://$(hostname -I | awk '{print $1}'):8081"

