# YouTube视频管理器 - Docker镜像
# 版本: v2.1.0
# 构建时间: $(date)

# 使用官方Nginx镜像作为基础镜像
FROM nginx:alpine

# 设置标签信息
LABEL maintainer="YouTube Video Manager"
LABEL version="2.1.0"
LABEL description="YouTube视频搜索和评论管理工具"

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 复制项目文件到容器
COPY index.html .
COPY config.json .
COPY api-key-config.js .
COPY assets/ ./assets/
COPY test-docker-access.html .

# 复制自定义Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 设置正确的权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 暴露端口
EXPOSE 80 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
