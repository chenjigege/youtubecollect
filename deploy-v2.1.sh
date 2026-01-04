#!/bin/bash

# YouTube视频管理器 v2.1.0 部署脚本
# 作者: YouTube Video Manager Team
# 日期: $(date)

set -e

echo "🚀 开始部署 YouTube视频管理器 v2.1.0..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    print_step "检查Docker环境..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    print_message "Docker环境检查通过"
}

# 停止现有容器
stop_existing() {
    print_step "停止现有容器..."
    if docker ps -q -f name=youtube-video-manager | grep -q .; then
        docker stop youtube-video-manager
        print_message "已停止现有容器"
    else
        print_message "没有运行中的容器"
    fi
}

# 删除旧镜像
cleanup_images() {
    print_step "清理旧镜像..."
    if docker images -q youtube-video-manager:v2.1.0 | grep -q .; then
        docker rmi youtube-video-manager:v2.1.0
        print_message "已删除旧镜像"
    fi
}

# 构建新镜像
build_image() {
    print_step "构建新镜像..."
    docker build -t youtube-video-manager:v2.1.0 .
    print_message "镜像构建完成"
}

# 启动服务
start_services() {
    print_step "启动服务..."
    docker-compose up -d
    print_message "服务启动完成"
}

# 检查服务状态
check_status() {
    print_step "检查服务状态..."
    sleep 5
    
    if docker ps | grep -q youtube-video-manager; then
        print_message "✅ 容器运行正常"
        
        # 检查健康状态
        if docker inspect youtube-video-manager --format='{{.State.Health.Status}}' | grep -q healthy; then
            print_message "✅ 健康检查通过"
        else
            print_warning "⚠️  健康检查未通过，但容器正在运行"
        fi
        
        # 显示访问信息
        echo ""
        print_message "🌐 访问地址:"
        echo "  本地访问: http://localhost:8081"
        echo "  网络访问: http://$(hostname -I | awk '{print $1}'):8081"
        echo ""
        
    else
        print_error "❌ 容器启动失败"
        docker logs youtube-video-manager
        exit 1
    fi
}

# 显示日志
show_logs() {
    print_step "显示容器日志..."
    docker logs youtube-video-manager --tail 20
}

# 主函数
main() {
    echo "=========================================="
    echo "  YouTube视频管理器 v2.1.0 部署脚本"
    echo "=========================================="
    echo ""
    
    check_docker
    stop_existing
    cleanup_images
    build_image
    start_services
    check_status
    show_logs
    
    echo ""
    print_message "🎉 部署完成！"
    print_message "📝 使用 'docker-compose logs -f' 查看实时日志"
    print_message "📝 使用 'docker-compose down' 停止服务"
    print_message "📝 使用 'docker-compose restart' 重启服务"
    echo ""
}

# 执行主函数
main "$@"