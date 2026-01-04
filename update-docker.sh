#!/bin/bash

# YouTube视频管理器 - 云服务器更新脚本
# 用于在云服务器上更新Docker容器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="youtube-video-manager"
CONTAINER_NAME="youtube-video-manager"
IMAGE_NAME="youtube-video-manager:v2.1.0"
BACKUP_DIR="./backups"

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

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 备份当前配置和数据
backup_current() {
    log_info "备份当前配置和数据..."
    
    # 创建备份目录
    mkdir -p "$BACKUP_DIR"
    
    # 备份时间戳
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # 备份配置文件
    if [ -f "config.json" ]; then
        cp config.json "$BACKUP_PATH/"
        log_info "已备份 config.json"
    fi
    
    if [ -f "api-key-config.js" ]; then
        cp api-key-config.js "$BACKUP_PATH/"
        log_info "已备份 api-key-config.js"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml "$BACKUP_PATH/"
        log_info "已备份 docker-compose.yml"
    fi
    
    # 备份日志（如果存在）
    if [ -d "logs" ]; then
        cp -r logs "$BACKUP_PATH/" 2>/dev/null || true
    fi
    
    log_success "备份完成: $BACKUP_PATH"
}

# 停止当前容器
stop_current() {
    log_info "停止当前容器..."
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        docker-compose down
        log_success "容器已停止"
    else
        log_warning "容器未运行"
    fi
}

# 清理旧镜像（可选）
cleanup_old_images() {
    if [ "$CLEANUP" = "true" ]; then
        log_info "清理旧镜像..."
        docker image prune -f
        log_success "清理完成"
    fi
}

# 构建新镜像
build_new_image() {
    log_info "构建新的Docker镜像..."
    
    if [ "$NO_CACHE" = "true" ]; then
        docker-compose build --no-cache
    else
        docker-compose build
    fi
    
    if [ $? -eq 0 ]; then
        log_success "镜像构建成功"
    else
        log_error "镜像构建失败"
        exit 1
    fi
}

# 启动新容器
start_new_container() {
    log_info "启动新容器..."
    
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_success "容器启动成功"
    else
        log_error "容器启动失败"
        exit 1
    fi
    
    # 等待服务就绪
    log_info "等待服务就绪..."
    sleep 5
    
    # 检查服务状态
    if docker ps | grep -q "$CONTAINER_NAME"; then
        log_success "服务运行正常"
    else
        log_error "服务未正常运行"
        docker-compose logs
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查容器状态
    if docker ps | grep -q "$CONTAINER_NAME"; then
        log_success "容器运行正常"
    else
        log_error "容器未运行"
        return 1
    fi
    
    # 检查HTTP响应（如果可能）
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "HTTP服务响应正常"
        else
            log_warning "HTTP服务可能未就绪（返回码: $HTTP_CODE）"
        fi
    fi
    
    return 0
}

# 显示更新信息
show_update_info() {
    echo ""
    echo "=========================================="
    log_success "更新完成！"
    echo "=========================================="
    echo ""
    echo "📋 更新信息："
    echo "   - 容器名称: $CONTAINER_NAME"
    echo "   - 镜像版本: $IMAGE_NAME"
    echo "   - 更新时间: $(date)"
    echo ""
    echo "📊 服务状态："
    docker-compose ps
    echo ""
    echo "📁 备份位置: $BACKUP_PATH"
    echo ""
    echo "🔍 查看日志: docker-compose logs -f"
    echo "🛑 停止服务: docker-compose down"
    echo "🔄 重启服务: docker-compose restart"
    echo ""
}

# 回滚到上一个版本
rollback() {
    log_warning "回滚到上一个版本..."
    
    # 查找最新的备份
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_* 2>/dev/null | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "未找到备份文件"
        exit 1
    fi
    
    log_info "使用备份: $LATEST_BACKUP"
    
    # 停止当前容器
    stop_current
    
    # 恢复配置文件
    if [ -f "$LATEST_BACKUP/config.json" ]; then
        cp "$LATEST_BACKUP/config.json" .
        log_info "已恢复 config.json"
    fi
    
    if [ -f "$LATEST_BACKUP/api-key-config.js" ]; then
        cp "$LATEST_BACKUP/api-key-config.js" .
        log_info "已恢复 api-key-config.js"
    fi
    
    if [ -f "$LATEST_BACKUP/docker-compose.yml" ]; then
        cp "$LATEST_BACKUP/docker-compose.yml" .
        log_info "已恢复 docker-compose.yml"
    fi
    
    # 重新构建和启动
    build_new_image
    start_new_container
    
    log_success "回滚完成"
}

# 主更新流程
main_update() {
    log_info "开始更新流程..."
    echo ""
    
    # 检查Docker环境
    check_docker
    
    # 备份当前版本
    backup_current
    
    # 停止当前容器
    stop_current
    
    # 清理旧镜像（可选）
    cleanup_old_images
    
    # 构建新镜像
    build_new_image
    
    # 启动新容器
    start_new_container
    
    # 健康检查
    health_check
    
    # 显示更新信息
    show_update_info
}

# 解析命令行参数
CLEANUP="false"
NO_CACHE="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup)
            CLEANUP="true"
            shift
            ;;
        --no-cache)
            NO_CACHE="true"
            shift
            ;;
        rollback)
            rollback
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            echo "使用方法: $0 [--cleanup] [--no-cache] [rollback]"
            exit 1
            ;;
    esac
done

# 执行主更新流程
main_update



