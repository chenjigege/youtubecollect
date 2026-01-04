/**
 * 批量评论获取处理器
 * 支持批量获取多个视频的评论，包含进度管理、错误处理、速率控制
 */
class BatchCommentProcessor {
    constructor(commentFetcher, rateLimiter) {
        this.commentFetcher = commentFetcher;
        this.rateLimiter = rateLimiter;
        this.isProcessing = false;
        this.isPaused = false;
        this.shouldCancel = false;
        
        // 处理状态
        this.totalVideos = 0;
        this.processedVideos = 0;
        this.successfulVideos = 0;
        this.failedVideos = 0;
        this.skippedVideos = 0;
        this.currentVideoIndex = 0;
        
        // 结果存储
        this.results = new Map(); // videoId -> { success: boolean, comments: [], error: null }
        this.startTime = null;
        
        // 回调函数
        this.onProgress = null;
        this.onVideoStart = null;
        this.onVideoComplete = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * 开始批量处理
     * @param {Array} videos - 视频列表
     * @param {Object} options - 处理选项
     */
    async startBatch(videos, options = {}) {
        if (this.isProcessing) {
            throw new Error('批量处理正在进行中');
        }

        // 初始化状态
        this.isProcessing = true;
        this.isPaused = false;
        this.shouldCancel = false;
        this.totalVideos = videos.length;
        this.processedVideos = 0;
        this.successfulVideos = 0;
        this.failedVideos = 0;
        this.skippedVideos = 0;
        this.currentVideoIndex = 0;
        this.results.clear();
        this.startTime = new Date();

        const {
            skipExisting = false,        // 跳过已有缓存的视频
            requestInterval = 2000,      // 请求间隔(ms)
            maxRetries = 1,             // 最大重试次数
            continueOnError = true       // 出错时继续处理
        } = options;

        console.log(`🚀 开始批量处理 ${this.totalVideos} 个视频`);
        
        try {
            for (let i = 0; i < videos.length; i++) {
                if (this.shouldCancel) {
                    console.log('❌ 用户取消批量处理');
                    break;
                }

                // 处理暂停
                while (this.isPaused) {
                    await this.sleep(100);
                    if (this.shouldCancel) break;
                }

                if (this.shouldCancel) break;

                const video = videos[i];
                this.currentVideoIndex = i;
                
                console.log(`📹 处理视频 ${i + 1}/${videos.length}: ${video.title}`);
                
                // 触发开始回调
                if (this.onVideoStart) {
                    this.onVideoStart(video, i + 1, videos.length);
                }

                try {
                    // 检查是否跳过已存在的缓存
                    if (skipExisting && window.app?.commentCacheManager?.getFromCache(video.id)) {
                        console.log(`⏭️ 跳过已缓存的视频: ${video.title}`);
                        this.results.set(video.id, {
                            success: true,
                            comments: [],
                            error: null,
                            skipped: true,
                            reason: 'cached'
                        });
                        this.skippedVideos++;
                        this.processedVideos++;
                        
                        if (this.onVideoComplete) {
                            this.onVideoComplete(video, true, null, 'skipped');
                        }
                        continue;
                    }

                    // 检查API配额
                    if (!this.rateLimiter.checkQuota(5)) {
                        console.log('⚠️ API配额不足，停止批量处理');
                        this.results.set(video.id, {
                            success: false,
                            comments: [],
                            error: new Error('API配额不足'),
                            skipped: false
                        });
                        this.failedVideos++;
                        this.processedVideos++;
                        
                        if (!continueOnError) {
                            throw new Error('API配额不足，停止处理');
                        }
                        continue;
                    }

                    // 获取评论（带重试机制）
                    let success = false;
                    let comments = [];
                    let lastError = null;

                    for (let retry = 0; retry <= maxRetries; retry++) {
                        try {
                            comments = await this.commentFetcher.fetchVideoComments(video.id, {
                                maxComments: 100,
                                includeReplies: true,
                                sortOrder: 'relevance'
                            });
                            
                            success = true;
                            break;
                        } catch (error) {
                            lastError = error;
                            console.log(`❌ 获取评论失败 (重试 ${retry}/${maxRetries}): ${error.message}`);
                            
                            if (retry < maxRetries) {
                                await this.sleep(requestInterval);
                            }
                        }
                    }

                    // 记录结果
                    this.results.set(video.id, {
                        success: success,
                        comments: comments || [],
                        error: lastError,
                        skipped: false
                    });

                    if (success) {
                        this.successfulVideos++;
                        console.log(`✅ 成功获取 ${comments.length} 条评论: ${video.title}`);
                    } else {
                        this.failedVideos++;
                        console.log(`❌ 获取评论失败: ${video.title} - ${lastError?.message}`);
                        
                        if (!continueOnError) {
                            throw lastError;
                        }
                    }

                    this.processedVideos++;

                    // 触发完成回调
                    if (this.onVideoComplete) {
                        this.onVideoComplete(video, success, comments, lastError);
                    }

                    // 触发进度回调
                    if (this.onProgress) {
                        this.onProgress({
                            current: this.processedVideos,
                            total: this.totalVideos,
                            successful: this.successfulVideos,
                            failed: this.failedVideos,
                            skipped: this.skippedVideos,
                            percentage: Math.round((this.processedVideos / this.totalVideos) * 100)
                        });
                    }

                    // 请求间隔
                    if (i < videos.length - 1) {
                        await this.sleep(requestInterval);
                    }

                } catch (error) {
                    console.error(`❌ 处理视频时出错: ${video.title}`, error);
                    
                    this.results.set(video.id, {
                        success: false,
                        comments: [],
                        error: error,
                        skipped: false
                    });
                    
                    this.failedVideos++;
                    this.processedVideos++;
                    
                    if (this.onVideoComplete) {
                        this.onVideoComplete(video, false, null, error);
                    }
                    
                    if (!continueOnError) {
                        throw error;
                    }
                }
            }

            // 处理完成
            const endTime = new Date();
            const duration = endTime - this.startTime;
            
            const summary = {
                totalVideos: this.totalVideos,
                processedVideos: this.processedVideos,
                successfulVideos: this.successfulVideos,
                failedVideos: this.failedVideos,
                skippedVideos: this.skippedVideos,
                duration: duration,
                results: this.results,
                cancelled: this.shouldCancel
            };

            console.log('🎉 批量处理完成:', summary);
            
            if (this.onComplete) {
                this.onComplete(summary);
            }

            return summary;

        } catch (error) {
            console.error('❌ 批量处理出错:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            throw error;
        } finally {
            this.isProcessing = false;
            this.isPaused = false;
            this.shouldCancel = false;
        }
    }

    /**
     * 暂停处理
     */
    pause() {
        if (this.isProcessing && !this.isPaused) {
            this.isPaused = true;
            console.log('⏸️ 批量处理已暂停');
            return true;
        }
        return false;
    }

    /**
     * 继续处理
     */
    resume() {
        if (this.isProcessing && this.isPaused) {
            this.isPaused = false;
            console.log('▶️ 批量处理已继续');
            return true;
        }
        return false;
    }

    /**
     * 取消处理
     */
    cancel() {
        if (this.isProcessing) {
            this.shouldCancel = true;
            this.isPaused = false;
            console.log('❌ 批量处理已取消');
            return true;
        }
        return false;
    }

    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            shouldCancel: this.shouldCancel,
            totalVideos: this.totalVideos,
            processedVideos: this.processedVideos,
            successfulVideos: this.successfulVideos,
            failedVideos: this.failedVideos,
            skippedVideos: this.skippedVideos,
            currentVideoIndex: this.currentVideoIndex,
            progress: this.totalVideos > 0 ? Math.round((this.processedVideos / this.totalVideos) * 100) : 0,
            estimatedTimeRemaining: this.calculateEstimatedTime()
        };
    }

    /**
     * 计算预估剩余时间
     */
    calculateEstimatedTime() {
        if (!this.startTime || this.processedVideos === 0) {
            return null;
        }

        const elapsed = new Date() - this.startTime;
        const avgTimePerVideo = elapsed / this.processedVideos;
        const remainingVideos = this.totalVideos - this.processedVideos;
        const estimatedRemaining = Math.round(avgTimePerVideo * remainingVideos);

        return estimatedRemaining;
    }

    /**
     * 格式化时间
     */
    formatTime(milliseconds) {
        if (!milliseconds) return '--';
        
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
     * 获取处理结果统计
     */
    getResultStats() {
        const stats = {
            totalComments: 0,
            totalReplies: 0,
            totalLikes: 0,
            uniqueAuthors: new Set(),
            successfulVideos: [],
            failedVideos: [],
            skippedVideos: []
        };

        this.results.forEach((result, videoId) => {
            if (result.success && !result.skipped) {
                stats.successfulVideos.push(videoId);
                
                if (result.comments) {
                    result.comments.forEach(comment => {
                        if (comment.type === 'comment') {
                            stats.totalComments++;
                        } else if (comment.type === 'reply') {
                            stats.totalReplies++;
                        }
                        stats.totalLikes += comment.likeCount || 0;
                        stats.uniqueAuthors.add(comment.author);
                    });
                }
            } else if (result.skipped) {
                stats.skippedVideos.push(videoId);
            } else {
                stats.failedVideos.push(videoId);
            }
        });

        stats.uniqueAuthors = stats.uniqueAuthors.size;
        return stats;
    }

    /**
     * 休眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.onProgress = null;
        this.onVideoStart = null;
        this.onVideoComplete = null;
        this.onComplete = null;
        this.onError = null;
        this.results.clear();
    }
}

// 导出类
window.BatchCommentProcessor = BatchCommentProcessor;