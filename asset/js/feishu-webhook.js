/**
 * 飞书Webhook推送服务
 * 支持单个推送、批量推送、定时推送
 */
class FeishuWebhookService {
    constructor() {
        this.webhookUrl = '';
        this.messageFormatter = new MessageFormatter();
        this.isEnabled = false;
        this.rateLimiter = null; // 推送速率限制
        this.scheduledTasks = new Map(); // 定时任务
        
        // 推送统计
        this.stats = {
            totalSent: 0,
            successful: 0,
            failed: 0,
            lastSentTime: null
        };
        
        this.loadConfig();
    }

    /**
     * 加载配置
     */
    loadConfig() {
        try {
            const config = JSON.parse(localStorage.getItem('feishu_config') || '{}');
            this.webhookUrl = config.webhookUrl || '';
            this.isEnabled = config.enabled || false;
            
            if (this.webhookUrl) {
                console.log('🚀 飞书推送配置已加载');
            }
        } catch (error) {
            console.error('加载飞书配置失败:', error);
        }
    }

    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            const newConfig = {
                webhookUrl: config.webhookUrl || this.webhookUrl,
                enabled: config.enabled !== undefined ? config.enabled : this.isEnabled,
                template: config.template || 'full',
                maxComments: config.maxComments || 50,
                ...config
            };
            
            localStorage.setItem('feishu_config', JSON.stringify(newConfig));
            
            this.webhookUrl = newConfig.webhookUrl;
            this.isEnabled = newConfig.enabled;
            
            console.log('✅ 飞书配置已保存');
            return true;
        } catch (error) {
            console.error('保存飞书配置失败:', error);
            return false;
        }
    }

    /**
     * 验证Webhook URL
     */
    validateWebhookUrl(url) {
        if (!url) return { valid: false, error: 'Webhook URL不能为空' };
        
        try {
            const urlObj = new URL(url);
            if (!url.includes('open.feishu.cn') && !url.includes('open.larksuite.com')) {
                return { valid: false, error: '请输入有效的飞书Webhook URL' };
            }
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'URL格式不正确' };
        }
    }

    /**
     * 测试连接
     */
    async testConnection(webhookUrl = null) {
        const url = webhookUrl || this.webhookUrl;
        
        if (!url) {
            throw new Error('Webhook URL未配置');
        }

        const validation = this.validateWebhookUrl(url);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const testMessage = {
            msg_type: "text",
            content: {
                text: "🧪 飞书推送测试消息\\n\\n如果您看到这条消息，说明配置正确！\\n\\n⏰ " + new Date().toLocaleString('zh-CN')
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testMessage)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`推送失败: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            
            if (result.code === 0) {
                console.log('✅ 飞书推送测试成功');
                return { success: true, message: '测试消息发送成功！' };
            } else {
                throw new Error(result.msg || '推送失败');
            }
        } catch (error) {
            console.error('❌ 飞书推送测试失败:', error);
            throw error;
        }
    }

    /**
     * 发送单个视频信息
     */
    async sendVideo(video, comments = [], options = {}) {
        if (!this.isEnabled || !this.webhookUrl) {
            throw new Error('飞书推送未启用或未配置');
        }

        const {
            template = 'full',
            maxComments = 50
        } = options;

        try {
            // 格式化消息
            const messageText = this.messageFormatter.formatForFeishu(video, comments, {
                template,
                maxComments
            });

            // 验证消息长度
            const validation = this.messageFormatter.validateMessageLength(messageText);
            const finalMessage = validation.valid ? messageText : validation.message;
            
            if (!validation.valid) {
                console.warn('⚠️ 消息过长已截断:', validation.warning);
            }

            // 构造飞书消息格式
            const feishuMessage = {
                msg_type: "text",
                content: {
                    text: finalMessage
                }
            };

            // 发送请求
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feishuMessage)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`推送失败: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            
            if (result.code === 0) {
                // 更新统计
                this.stats.totalSent++;
                this.stats.successful++;
                this.stats.lastSentTime = new Date();
                
                console.log(`✅ 成功推送视频: ${video.title}`);
                return { success: true, result };
            } else {
                throw new Error(result.msg || '推送失败');
            }
        } catch (error) {
            this.stats.totalSent++;
            this.stats.failed++;
            console.error(`❌ 推送视频失败: ${video.title}`, error);
            throw error;
        }
    }

    /**
     * 批量推送视频
     */
    async sendBatch(videosWithComments, options = {}) {
        if (!this.isEnabled || !this.webhookUrl) {
            throw new Error('飞书推送未启用或未配置');
        }

        const {
            interval = 2000,        // 推送间隔(ms)
            template = 'full',
            maxComments = 50,
            sendSummary = true,     // 是否发送汇总
            onProgress = null       // 进度回调
        } = options;

        const results = [];
        let successCount = 0;
        let failedCount = 0;

        console.log(`🚀 开始批量推送 ${videosWithComments.length} 个视频`);

        try {
            for (let i = 0; i < videosWithComments.length; i++) {
                const { video, comments } = videosWithComments[i];
                
                try {
                    await this.sendVideo(video, comments, { template, maxComments });
                    successCount++;
                    results.push({ video, success: true, error: null });
                    
                    console.log(`✅ 推送进度: ${i + 1}/${videosWithComments.length} - ${video.title}`);
                } catch (error) {
                    failedCount++;
                    results.push({ video, success: false, error });
                    
                    console.error(`❌ 推送失败: ${video.title}`, error.message);
                }

                // 进度回调
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: videosWithComments.length,
                        successful: successCount,
                        failed: failedCount,
                        percentage: Math.round(((i + 1) / videosWithComments.length) * 100)
                    });
                }

                // 推送间隔（最后一个不需要等待）
                if (i < videosWithComments.length - 1) {
                    await this.sleep(interval);
                }
            }

            // 发送汇总信息
            if (sendSummary && videosWithComments.length > 1) {
                await this.sleep(interval);
                await this.sendSummary({
                    totalVideos: videosWithComments.length,
                    successful: successCount,
                    failed: failedCount,
                    duration: null // 可以传入实际耗时
                });
            }

            console.log(`🎉 批量推送完成: 成功${successCount}个，失败${failedCount}个`);
            
            return {
                success: true,
                totalVideos: videosWithComments.length,
                successful: successCount,
                failed: failedCount,
                results
            };

        } catch (error) {
            console.error('❌ 批量推送出错:', error);
            throw error;
        }
    }

    /**
     * 发送汇总信息
     */
    async sendSummary(stats) {
        const summaryText = this.messageFormatter.formatSummary(stats);
        
        const feishuMessage = {
            msg_type: "text",
            content: {
                text: summaryText
            }
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feishuMessage)
            });

            if (response.ok) {
                console.log('✅ 汇总信息推送成功');
            }
        } catch (error) {
            console.error('❌ 汇总信息推送失败:', error);
        }
    }

    /**
     * 定时推送
     */
    scheduleRegularPush(options = {}) {
        const {
            interval = 60 * 60 * 1000, // 默认1小时
            maxVideos = 5,              // 每次最多推送5个视频
            template = 'simple',        // 定时推送使用简洁模板
            taskId = 'regular_push'
        } = options;

        // 清除现有任务
        this.clearScheduledTask(taskId);

        const task = setInterval(async () => {
            try {
                await this.performScheduledPush({ maxVideos, template });
            } catch (error) {
                console.error('❌ 定时推送失败:', error);
            }
        }, interval);

        this.scheduledTasks.set(taskId, {
            task,
            interval,
            options,
            createdAt: new Date()
        });

        console.log(`⏰ 定时推送已启动，间隔: ${interval / 1000}秒`);
        return taskId;
    }

    /**
     * 执行定时推送
     */
    async performScheduledPush(options = {}) {
        const { maxVideos = 5, template = 'simple' } = options;
        
        try {
            // 获取最新的视频（这里需要和videoManager集成）
            if (!window.videoManager || !window.videoManager.videos) {
                console.log('⏭️ 没有可推送的视频');
                return;
            }

            const videos = window.videoManager.videos.slice(0, maxVideos);
            const videosWithComments = [];

            // 获取视频和评论数据
            for (const video of videos) {
                const comments = window.app?.currentComments?.get(video.id) || [];
                videosWithComments.push({ video, comments });
            }

            if (videosWithComments.length === 0) {
                console.log('⏭️ 没有可推送的内容');
                return;
            }

            // 执行推送
            await this.sendBatch(videosWithComments, {
                template,
                sendSummary: false,
                interval: 1000 // 定时推送间隔短一些
            });
            
            console.log(`✅ 定时推送完成: ${videosWithComments.length} 个视频`);
        } catch (error) {
            console.error('❌ 定时推送失败:', error);
        }
    }

    /**
     * 清除定时任务
     */
    clearScheduledTask(taskId) {
        const taskInfo = this.scheduledTasks.get(taskId);
        if (taskInfo) {
            clearInterval(taskInfo.task);
            this.scheduledTasks.delete(taskId);
            console.log(`⏹️ 定时任务已清除: ${taskId}`);
            return true;
        }
        return false;
    }

    /**
     * 清除所有定时任务
     */
    clearAllScheduledTasks() {
        this.scheduledTasks.forEach((taskInfo, taskId) => {
            clearInterval(taskInfo.task);
        });
        this.scheduledTasks.clear();
        console.log('⏹️ 所有定时任务已清除');
    }

    /**
     * 获取推送统计
     */
    getStats() {
        return {
            ...this.stats,
            scheduledTasks: Array.from(this.scheduledTasks.entries()).map(([id, info]) => ({
                id,
                interval: info.interval,
                createdAt: info.createdAt,
                options: info.options
            }))
        };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalSent: 0,
            successful: 0,
            failed: 0,
            lastSentTime: null
        };
    }

    /**
     * 休眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取配置
     */
    getConfig() {
        try {
            return JSON.parse(localStorage.getItem('feishu_config') || '{}');
        } catch (error) {
            return {};
        }
    }

    /**
     * 销毁服务
     */
    destroy() {
        this.clearAllScheduledTasks();
        this.isEnabled = false;
        console.log('🗑️ 飞书推送服务已销毁');
    }
}

// 导出类
window.FeishuWebhookService = FeishuWebhookService;