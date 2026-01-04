/**
 * 消息格式化器 - 将视频和评论数据格式化为各种推送格式
 */
class MessageFormatter {
    constructor() {
        this.maxComments = 50; // 默认最多推送50条评论
        this.maxCommentLength = 200; // 单条评论最大长度
    }

    /**
     * 格式化为飞书消息格式
     * @param {Object} video - 视频数据
     * @param {Array} comments - 评论数据
     * @param {Object} options - 格式化选项
     */
    formatForFeishu(video, comments = [], options = {}) {
        const {
            includeComments = true,
            maxComments = this.maxComments,
            template = 'full' // full, simple
        } = options;

        try {
            if (template === 'simple') {
                return this.formatSimpleMessage(video, comments, options);
            }
            
            return this.formatFullMessage(video, comments, options);
        } catch (error) {
            console.error('格式化飞书消息失败:', error);
            return this.formatErrorMessage(video, error);
        }
    }

    /**
     * 格式化完整消息
     */
    formatFullMessage(video, comments = [], options = {}) {
        const { maxComments = this.maxComments } = options;
        
        // 基本信息
        let message = `标题: ${video.title}\n\n`;
        
        // 视频介绍
        if (video.description) {
            const description = this.truncateText(video.description, 300);
            message += `📄 介绍:\n${description}\n\n`;
        }
        
        // 链接和基本信息
        message += `🔗 链接: ${video.url}\n`;
        message += `👤 作者: ${video.channelTitle}\n`;
        
        if (video.viewCount) {
            message += `👀 观看数: ${this.formatNumber(video.viewCount)}\n`;
        }
        
        if (video.commentCount) {
            message += `💬 评论数: ${this.formatNumber(video.commentCount)}\n`;
        }
        
        if (video.publishedAt) {
            message += `📅 发布时间: ${this.formatDate(video.publishedAt)}\n`;
        }

        // 评论内容
        if (comments && comments.length > 0) {
            message += `\n💬 评论内容\n\n`;
            
            // 排序评论（按点赞数或时间）
            const sortedComments = this.sortComments(comments, 'likes');
            const displayComments = sortedComments.slice(0, maxComments);
            
            displayComments.forEach((comment, index) => {
                if (comment.type === 'comment') { // 只显示主评论，不显示回复
                    const commentText = this.truncateText(comment.text, this.maxCommentLength);
                    const likeCount = comment.likeCount || 0;
                    const publishTime = this.formatDate(comment.publishedAt);
                    
                    message += `${index + 1}. 【${comment.author}】 (👍 ${likeCount}) - ${publishTime}\n`;
                    message += `   ${commentText}\n\n`;
                }
            });
            
            // 如果有更多评论
            const totalTopComments = comments.filter(c => c.type === 'comment').length;
            if (totalTopComments > maxComments) {
                message += `... 还有 ${totalTopComments - maxComments} 条评论未显示\n`;
            }
        }

        return message;
    }

    /**
     * 格式化简洁消息
     */
    formatSimpleMessage(video, comments = [], options = {}) {
        let message = `🎬 ${video.title}\n\n`;
        message += `👤 ${video.channelTitle}\n`;
        message += `🔗 ${video.url}\n`;
        
        if (video.viewCount) {
            message += `👀 ${this.formatNumber(video.viewCount)} 观看\n`;
        }
        
        if (comments && comments.length > 0) {
            const topComments = comments.filter(c => c.type === 'comment').slice(0, 3);
            message += `\n💬 热门评论:\n`;
            
            topComments.forEach((comment, index) => {
                const commentText = this.truncateText(comment.text, 100);
                message += `${index + 1}. ${comment.author}: ${commentText}\n`;
            });
        }

        return message;
    }

    /**
     * 格式化错误消息
     */
    formatErrorMessage(video, error) {
        return `❌ 处理视频时出错\n\n标题: ${video.title}\n🔗 ${video.url}\n\n错误信息: ${error.message}`;
    }

    /**
     * 格式化为JSON格式（用于其他平台）
     */
    formatForJson(video, comments = [], options = {}) {
        const { maxComments = this.maxComments } = options;
        
        const data = {
            video: {
                title: video.title,
                description: video.description,
                url: video.url,
                channelTitle: video.channelTitle,
                viewCount: video.viewCount,
                commentCount: video.commentCount,
                publishedAt: video.publishedAt,
                thumbnailUrl: video.thumbnailUrl
            },
            comments: comments.slice(0, maxComments).map(comment => ({
                id: comment.id,
                author: comment.author,
                text: comment.text,
                likeCount: comment.likeCount,
                publishedAt: comment.publishedAt,
                type: comment.type
            })),
            metadata: {
                totalComments: comments.length,
                topLevelComments: comments.filter(c => c.type === 'comment').length,
                replies: comments.filter(c => c.type === 'reply').length,
                generatedAt: new Date().toISOString()
            }
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * 批量格式化多个视频
     */
    formatBatch(videosWithComments, options = {}) {
        const { 
            template = 'full',
            separator = '\n' + '='.repeat(50) + '\n\n'
        } = options;

        const messages = [];
        
        videosWithComments.forEach(({ video, comments }) => {
            try {
                const message = this.formatForFeishu(video, comments, { ...options, template });
                messages.push(message);
            } catch (error) {
                console.error(`格式化视频失败: ${video.title}`, error);
                messages.push(this.formatErrorMessage(video, error));
            }
        });

        return messages.join(separator);
    }

    /**
     * 格式化统计摘要
     */
    formatSummary(batchResult) {
        const stats = batchResult.getResultStats ? batchResult.getResultStats() : batchResult;
        
        let summary = `📊 批量处理完成\n\n`;
        summary += `🎬 处理视频: ${stats.totalVideos || 0}\n`;
        summary += `✅ 成功: ${stats.successfulVideos?.length || 0}\n`;
        summary += `❌ 失败: ${stats.failedVideos?.length || 0}\n`;
        summary += `⏭️ 跳过: ${stats.skippedVideos?.length || 0}\n`;
        summary += `💬 获取评论: ${stats.totalComments || 0} 条\n`;
        summary += `💖 总点赞数: ${this.formatNumber(stats.totalLikes || 0)}\n`;
        summary += `👥 独特作者: ${stats.uniqueAuthors || 0} 人\n`;
        
        if (batchResult.duration) {
            summary += `⏱️ 处理时长: ${this.formatDuration(batchResult.duration)}\n`;
        }

        return summary;
    }

    /**
     * 排序评论
     */
    sortComments(comments, sortBy = 'likes') {
        const sorted = [...comments];
        
        if (sortBy === 'likes') {
            return sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        } else if (sortBy === 'time') {
            return sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        }
        
        return sorted;
    }

    /**
     * 截断文本
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (!num) return '0';
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
        return (num / 1000000000).toFixed(1) + 'B';
    }

    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 格式化持续时间
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}小时${minutes % 60}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    }

    /**
     * 验证消息长度（飞书限制）
     */
    validateMessageLength(message, maxLength = 8000) {
        if (message.length <= maxLength) {
            return { valid: true, message };
        }

        // 如果超长，尝试截断
        const truncated = message.substring(0, maxLength - 100) + '\n\n... 内容已截断';
        return { 
            valid: false, 
            message: truncated, 
            originalLength: message.length,
            warning: `消息过长 (${message.length}字符)，已截断至${maxLength}字符`
        };
    }

    /**
     * 创建消息模板
     */
    createTemplate(name, template) {
        // 未来可扩展自定义模板功能
        const templates = {
            youtube_full: this.formatFullMessage.bind(this),
            youtube_simple: this.formatSimpleMessage.bind(this),
            custom: template
        };
        
        return templates[name] || templates.youtube_full;
    }
}

// 导出类
window.MessageFormatter = MessageFormatter;