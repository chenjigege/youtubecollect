#!/bin/bash

# YouTube视频管理器 - 统一部署脚本
# 支持Docker和本地部署，修复了API密钥保存bug

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="youtube-video-manager"
VERSION="v2.1-fixed"
API_KEY="AIzaSyBv4XLNnMm5iVmPTgI7idvrYi1OIAV4OwA"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "YouTube视频管理器 - 统一部署脚本"
    echo ""
    echo "使用方法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  docker    使用Docker部署 (默认)"
    echo "  local     使用本地Python服务器部署"
    echo "  build     仅构建Docker镜像"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  logs      查看日志"
    echo "  status    查看状态"
    echo "  clean     清理所有资源"
    echo "  help      显示此帮助信息"
    echo ""
    echo "选项:"
    echo "  --skip-test    跳过API测试"
    echo "  --no-cache     不使用缓存构建"
    echo ""
    echo "示例:"
    echo "  $0 docker --skip-test    # Docker部署，跳过API测试"
    echo "  $0 local                 # 本地部署"
    echo "  $0 build --no-cache      # 构建镜像，不使用缓存"
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        return 1
    fi
    
    log_success "Docker 环境检查通过"
    return 0
}

# 检查Python环境
check_python() {
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装，请先安装 Python3"
        return 1
    fi
    
    log_success "Python3 环境检查通过"
    return 0
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    mkdir -p logs
    log_success "目录创建完成"
}

# 测试API密钥（可选）
test_api_key() {
    if [[ "$SKIP_TEST" == "true" ]]; then
        log_warning "跳过API测试"
        return 0
    fi
    
    log_info "测试API密钥有效性..."
    if timeout 10 curl -s "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${API_KEY}&maxResults=1" | grep -q "kind"; then
        log_success "API密钥测试成功"
    else
        log_warning "API密钥测试超时或失败，但继续部署"
    fi
}

# Docker部署
deploy_docker() {
    log_info "开始Docker部署..."
    
    # 检查Docker环境
    if ! check_docker; then
        exit 1
    fi
    
    # 创建目录
    create_directories
    
    # 测试API密钥
    test_api_key
    
    # 停止现有容器
    log_info "停止现有容器..."
    docker-compose -f docker-compose.fixed.yml down 2>/dev/null || true
    
    # 清理旧镜像
    log_info "清理旧镜像..."
    docker system prune -f
    
    # 构建镜像
    log_info "构建Docker镜像..."
    if [[ "$NO_CACHE" == "true" ]]; then
        docker-compose -f docker-compose.fixed.yml build --no-cache
    else
        docker-compose -f docker-compose.fixed.yml build
    fi
    
    if [ $? -ne 0 ]; then
        log_error "镜像构建失败"
        exit 1
    fi
    
    log_success "镜像构建成功"
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f docker-compose.fixed.yml up -d
    
    if [ $? -ne 0 ]; then
        log_error "服务启动失败"
        exit 1
    fi
    
    log_success "服务启动成功"
    
    # 等待服务就绪
    log_info "等待服务就绪..."
    sleep 10
    
    # 检查服务状态
    check_service_status
    
    show_deployment_info "docker"
}

# 本地部署
deploy_local() {
    log_info "开始本地部署..."
    
    # 检查Python环境
    if ! check_python; then
        exit 1
    fi
    
    # 创建目录
    create_directories
    
    # 测试API密钥
    test_api_key
    
    # 检查端口是否被占用
    if lsof -i :8081 >/dev/null 2>&1; then
        log_warning "端口8081已被占用，尝试停止现有服务..."
        pkill -f "python3 -m http.server 8081" 2>/dev/null || true
        sleep 2
    fi
    
    # 启动Python服务器
    log_info "启动Python HTTP服务器..."
    nohup python3 -m http.server 8081 > logs/server.log 2>&1 &
    SERVER_PID=$!
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if ps -p $SERVER_PID > /dev/null; then
        log_success "Python服务器启动成功 (PID: $SERVER_PID)"
        echo $SERVER_PID > logs/server.pid
    else
        log_error "Python服务器启动失败"
        exit 1
    fi
    
    show_deployment_info "local"
}

# 检查服务状态
check_service_status() {
    log_info "检查服务状态..."
    
    if [[ "$DEPLOY_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.fixed.yml ps
        
        # 检查端口
        if netstat -tlnp | grep :8081 >/dev/null 2>&1; then
            log_success "端口8081正在监听"
        else
            log_warning "端口8081未监听，请检查服务状态"
        fi
    else
        # 检查Python服务器
        if [ -f logs/server.pid ]; then
            PID=$(cat logs/server.pid)
            if ps -p $PID > /dev/null; then
                log_success "Python服务器运行正常 (PID: $PID)"
            else
                log_warning "Python服务器未运行"
            fi
        fi
    fi
}

# 显示部署信息
show_deployment_info() {
    local deploy_type=$1
    
    echo ""
    echo "🎉 部署完成！"
    echo "📅 部署时间: $(date)"
    echo "🔧 版本: $VERSION"
    echo "🌐 访问地址: http://localhost:8081"
    echo "🔑 API密钥: $API_KEY"
    echo ""
    
    if [[ "$deploy_type" == "docker" ]]; then
        echo "📋 Docker管理命令:"
        echo "   查看日志: docker-compose -f docker-compose.fixed.yml logs -f"
        echo "   停止服务: docker-compose -f docker-compose.fixed.yml down"
        echo "   重启服务: docker-compose -f docker-compose.fixed.yml restart"
    else
        echo "📋 本地管理命令:"
        echo "   查看日志: tail -f logs/server.log"
        echo "   停止服务: pkill -f 'python3 -m http.server 8081'"
        echo "   重启服务: $0 local"
    fi
    
    echo ""
    echo "🔧 功能特性:"
    echo "   ✅ 修复了API密钥保存bug"
    echo "   ✅ 支持视频搜索和评论获取"
    echo "   ✅ 多用户同时访问"
    echo "   ✅ 自动API密钥轮换"
    echo ""
    echo "📞 技术支持: 查看项目文档或联系技术支持"
}

# 构建镜像
build_image() {
    log_info "构建Docker镜像..."
    
    if ! check_docker; then
        exit 1
    fi
    
    create_directories
    
    if [[ "$NO_CACHE" == "true" ]]; then
        docker-compose -f docker-compose.fixed.yml build --no-cache
    else
        docker-compose -f docker-compose.fixed.yml build
    fi
    
    log_success "镜像构建完成"
}

# 启动服务
start_service() {
    log_info "启动服务..."
    
    if [[ "$DEPLOY_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.fixed.yml up -d
    else
        deploy_local
    fi
}

# 停止服务
stop_service() {
    log_info "停止服务..."
    
    if [[ "$DEPLOY_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.fixed.yml down
    else
        pkill -f "python3 -m http.server 8081" 2>/dev/null || true
        rm -f logs/server.pid
    fi
    
    log_success "服务已停止"
}

# 重启服务
restart_service() {
    log_info "重启服务..."
    stop_service
    sleep 2
    start_service
}

# 查看日志
view_logs() {
    if [[ "$DEPLOY_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.fixed.yml logs -f
    else
        tail -f logs/server.log
    fi
}

# 查看状态
view_status() {
    log_info "服务状态:"
    
    if [[ "$DEPLOY_TYPE" == "docker" ]]; then
        docker-compose -f docker-compose.fixed.yml ps
    else
        if [ -f logs/server.pid ]; then
            PID=$(cat logs/server.pid)
            if ps -p $PID > /dev/null; then
                echo "Python服务器运行正常 (PID: $PID)"
            else
                echo "Python服务器未运行"
            fi
        else
            echo "Python服务器未运行"
        fi
    fi
}

# 清理资源
clean_resources() {
    log_warning "清理所有相关资源..."
    
    # 停止服务
    stop_service
    
    # 清理Docker资源
    if command -v docker &> /dev/null; then
        docker-compose -f docker-compose.fixed.yml down -v --remove-orphans 2>/dev/null || true
        docker system prune -f
    fi
    
    # 清理日志文件
    rm -f logs/server.pid logs/server.log
    
    log_success "清理完成"
}

# 解析命令行参数
SKIP_TEST="false"
NO_CACHE="false"
DEPLOY_TYPE="docker"

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-test)
            SKIP_TEST="true"
            shift
            ;;
        --no-cache)
            NO_CACHE="true"
            shift
            ;;
        docker|local|build|start|stop|restart|logs|status|clean|help)
            COMMAND=$1
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 设置默认命令
COMMAND=${COMMAND:-docker}

# 主函数
main() {
    case "$COMMAND" in
        docker)
            DEPLOY_TYPE="docker"
            deploy_docker
            ;;
        local)
            DEPLOY_TYPE="local"
            deploy_local
            ;;
        build)
            DEPLOY_TYPE="docker"
            build_image
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        logs)
            view_logs
            ;;
        status)
            view_status
            ;;
        clean)
            clean_resources
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main