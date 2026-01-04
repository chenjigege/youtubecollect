/**
 * YouTube评论管理器 - 增强版
 * 支持评论获取、分析、导出和情感分析
 */

class CommentManagerV2 {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.comments = new Map(); // videoId -> comments array
        this.analytics = {};
        this.maxCommentsPerVideo = 100; // 默认每个视频最多获取100条评论
    }

    /**
     * 设置每个视频的最大评论数
     */
    setMaxComments(max) {
        this.maxCommentsPerVideo = max;
    }

    /**
     * 获取视频评论
     */
    async fetchVideoComments(videoId, maxResults = null) {
        const limit = maxResults || this.maxCommentsPerVideo;
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?` +
            `part=snippet,replies&videoId=${videoId}&maxResults=${limit}&` +
            `order=relevance&key=${this.apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const comments = this.parseComments(data.items);
            
            // 保存到内存和本地存储
            this.comments.set(videoId, comments);
            this.saveToStorage();
            
            // 更新分析数据
            this.updateAnalytics(videoId, comments);
            
            return comments;
        } catch (error) {
            console.error('获取评论失败:', error);
            throw error;
        }
    }

    /**
     * 批量获取多个视频的评论
     */
    async fetchBatchComments(videoIds, progressCallback) {
        const results = [];
        
        for (let i = 0; i < videoIds.length; i++) {
            const videoId = videoIds[i];
            
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: videoIds.length,
                    videoId: videoId,
                    status: 'fetching'
                });
            }

            try {
                const comments = await this.fetchVideoComments(videoId);
                results.push({
                    videoId,
                    comments,
                    success: true
                });

                // 添加延迟避免API限制
                await this.delay(1000);
            } catch (error) {
                results.push({
                    videoId,
                    error: error.message,
                    success: false
                });
            }
        }

        return results;
    }

    /**
     * 获取回复评论的详细信息
     */
    async fetchReplyDetails(replyIds) {
        if (!replyIds || replyIds.length === 0) {
            return [];
        }

        try {
            const url = `https://www.googleapis.com/youtube/v3/comments?part=snippet&id=${replyIds.join(',')}&key=${this.apiKey}`;
            console.log(`获取回复评论详细信息，URL: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`获取回复评论失败: ${response.status}`);
            }

            const data = await response.json();
            console.log(`回复评论详细信息响应:`, data);
            
            return data.items || [];
        } catch (error) {
            console.error('获取回复评论详细信息失败:', error);
            return [];
        }
    }

    /**
     * 获取视频评论（增强版，包含完整的回复信息）
     */
    async fetchVideoCommentsEnhanced(videoId, maxResults = null) {
        const limit = maxResults || this.maxCommentsPerVideo;
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?` +
            `part=snippet,replies&videoId=${videoId}&maxResults=${limit}&` +
            `order=relevance&key=${this.apiKey}`;

        try {
            console.log(`开始获取视频 ${videoId} 的评论，URL: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            console.log(`评论线程API响应:`, data);
            
            // 收集所有需要获取详细信息的回复评论ID
            const replyIds = [];
            data.items.forEach(item => {
                if (item.replies && item.replies.comments) {
                    item.replies.comments.forEach(reply => {
                        replyIds.push(reply.id);
                    });
                }
            });

            // 如果有回复评论，获取它们的详细信息
            if (replyIds.length > 0) {
                console.log(`发现 ${replyIds.length} 个回复评论，准备获取详细信息`);
                const replyDetails = await this.fetchReplyDetails(replyIds);
                
                // 将详细信息合并到原始数据中
                data.items.forEach(item => {
                    if (item.replies && item.replies.comments) {
                        item.replies.comments.forEach(reply => {
                            const detail = replyDetails.find(d => d.id === reply.id);
                            if (detail) {
                                // 合并详细信息
                                Object.assign(reply, detail);
                            }
                        });
                    }
                });
            }

            const comments = this.parseComments(data.items);
            
            // 保存到内存和本地存储
            this.comments.set(videoId, comments);
            this.saveToStorage();
            
            // 更新分析数据
            this.updateAnalytics(videoId, comments);
            
            return comments;
        } catch (error) {
            console.error('获取评论失败:', error);
            throw error;
        }
    }

    /**
     * 解析评论数据
     */
    parseComments(items) {
        const comments = [];
        console.log('开始解析评论数据，原始数据:', items);

        items.forEach((item, index) => {
            console.log(`处理第${index + 1}个评论项:`, item);
            
            const topComment = item.snippet.topLevelComment.snippet;
            console.log(`主评论数据:`, topComment);
            
            // 主评论
            comments.push({
                id: item.id,
                videoId: topComment.videoId,
                text: topComment.textDisplay || topComment.textOriginal || '无内容',
                textOriginal: topComment.textOriginal || topComment.textDisplay || '无内容',
                author: topComment.authorDisplayName,
                authorChannel: topComment.authorChannelUrl,
                authorImage: topComment.authorProfileImageUrl,
                likes: topComment.likeCount,
                publishedAt: topComment.publishedAt,
                updatedAt: topComment.updatedAt,
                isReply: false,
                hasReplies: item.snippet.totalReplyCount > 0,
                replyCount: item.snippet.totalReplyCount || 0,
                sentiment: this.analyzeSentiment(topComment.textOriginal || topComment.textDisplay || ''),
                language: this.detectLanguage(topComment.textOriginal || topComment.textDisplay || '')
            });

            // 回复评论
            if (item.replies && item.replies.comments) {
                console.log(`发现回复评论，数量: ${item.replies.comments.length}`);
                console.log(`回复评论原始数据:`, item.replies.comments);
                
                item.replies.comments.forEach((reply, replyIndex) => {
                    console.log(`处理第${replyIndex + 1}个回复评论:`, reply);
                    
                    const replySnippet = reply.snippet;
                    console.log(`回复评论snippet数据:`, replySnippet);
                    
                    // 确保能获取到回复评论的文本内容
                    const replyText = replySnippet.textDisplay || replySnippet.textOriginal || replySnippet.text || '无内容';
                    console.log(`回复评论文本: "${replyText}"`);
                    
                    comments.push({
                        id: reply.id,
                        videoId: replySnippet.videoId,
                        parentId: item.id,
                        text: replyText,
                        textOriginal: replySnippet.textOriginal || replySnippet.textDisplay || replySnippet.text || '无内容',
                        author: replySnippet.authorDisplayName,
                        authorChannel: replySnippet.authorChannelUrl,
                        authorImage: replySnippet.authorProfileImageUrl,
                        likes: replySnippet.likeCount,
                        publishedAt: replySnippet.publishedAt,
                        updatedAt: replySnippet.updatedAt,
                        isReply: true,
                        hasReplies: false,
                        replyCount: 0,
                        sentiment: this.analyzeSentiment(replySnippet.textOriginal || replySnippet.textDisplay || replySnippet.text || ''),
                        language: this.detectLanguage(replySnippet.textOriginal || replySnippet.textDisplay || replySnippet.text || '')
                    });
                });
            } else {
                console.log(`评论 ${item.id} 没有回复或回复数据为空`);
            }
        });

        console.log(`评论解析完成，总共 ${comments.length} 条评论`);
        return comments;
    }

    /**
     * 简单的情感分析
     */
    analyzeSentiment(text) {
        const positiveWords = ['好', '棒', '赞', '喜欢', '优秀', 'good', 'great', 'love', 'awesome', 'excellent'];
        const negativeWords = ['差', '烂', '垃圾', '讨厌', '糟糕', 'bad', 'terrible', 'hate', 'awful', 'worst'];
        
        const textLower = text.toLowerCase();
        let score = 0;

        positiveWords.forEach(word => {
            if (textLower.includes(word)) score++;
        });

        negativeWords.forEach(word => {
            if (textLower.includes(word)) score--;
        });

        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    /**
     * 检测语言
     */
    detectLanguage(text) {
        // 简单的语言检测
        const chineseRegex = /[\u4e00-\u9fa5]/;
        const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
        const koreanRegex = /[\uac00-\ud7af]/;
        
        if (chineseRegex.test(text)) return 'zh';
        if (japaneseRegex.test(text)) return 'ja';
        if (koreanRegex.test(text)) return 'ko';
        return 'en';
    }

    /**
     * 更新分析数据
     */
    updateAnalytics(videoId, comments) {
        const analytics = {
            totalComments: comments.length,
            topLevelComments: comments.filter(c => !c.isReply).length,
            replies: comments.filter(c => c.isReply).length,
            totalLikes: comments.reduce((sum, c) => sum + c.likes, 0),
            averageLikes: comments.length > 0 ? 
                (comments.reduce((sum, c) => sum + c.likes, 0) / comments.length).toFixed(2) : 0,
            sentiment: {
                positive: comments.filter(c => c.sentiment === 'positive').length,
                negative: comments.filter(c => c.sentiment === 'negative').length,
                neutral: comments.filter(c => c.sentiment === 'neutral').length
            },
            languages: this.countLanguages(comments),
            topCommenters: this.getTopCommenters(comments),
            wordCloud: this.generateWordCloud(comments),
            timeDistribution: this.analyzeTimeDistribution(comments),
            engagementRate: this.calculateEngagementRate(comments)
        };

        this.analytics[videoId] = analytics;
        return analytics;
    }

    /**
     * 统计语言分布
     */
    countLanguages(comments) {
        const languages = {};
        comments.forEach(comment => {
            languages[comment.language] = (languages[comment.language] || 0) + 1;
        });
        return languages;
    }

    /**
     * 获取最活跃的评论者
     */
    getTopCommenters(comments) {
        const commenters = {};
        
        comments.forEach(comment => {
            if (!commenters[comment.author]) {
                commenters[comment.author] = {
                    name: comment.author,
                    count: 0,
                    totalLikes: 0,
                    image: comment.authorImage
                };
            }
            commenters[comment.author].count++;
            commenters[comment.author].totalLikes += comment.likes;
        });

        return Object.values(commenters)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    /**
     * 生成词云数据
     */
    generateWordCloud(comments) {
        const wordCount = {};
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', '的', '是', '在', '了', '和']);
        
        comments.forEach(comment => {
            const words = comment.textOriginal
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2 && !stopWords.has(word));
            
            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });
        });

        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * 分析评论时间分布
     */
    analyzeTimeDistribution(comments) {
        const distribution = {
            hourly: new Array(24).fill(0),
            daily: {},
            monthly: {}
        };

        comments.forEach(comment => {
            const date = new Date(comment.publishedAt);
            const hour = date.getHours();
            const day = date.toISOString().split('T')[0];
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            distribution.hourly[hour]++;
            distribution.daily[day] = (distribution.daily[day] || 0) + 1;
            distribution.monthly[month] = (distribution.monthly[month] || 0) + 1;
        });

        return distribution;
    }

    /**
     * 计算互动率
     */
    calculateEngagementRate(comments) {
        if (comments.length === 0) return 0;
        
        const withLikes = comments.filter(c => c.likes > 0).length;
        const withReplies = comments.filter(c => c.isReply).length;
        
        return ((withLikes + withReplies) / comments.length * 100).toFixed(2);
    }

    /**
     * 保存到本地存储
     */
    saveToStorage() {
        try {
            const data = {
                comments: Array.from(this.comments.entries()),
                analytics: this.analytics,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('youtube_comments_data', JSON.stringify(data));
        } catch (error) {
            console.error('保存评论数据失败:', error);
        }
    }

    /**
     * 从本地存储加载
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('youtube_comments_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.comments = new Map(data.comments);
                this.analytics = data.analytics;
                return true;
            }
        } catch (error) {
            console.error('加载评论数据失败:', error);
        }
        return false;
    }

    /**
     * 导出评论数据
     */
    exportComments(videoId, format = 'json') {
        const comments = this.comments.get(videoId);
        if (!comments) return null;

        switch (format) {
            case 'json':
                return JSON.stringify(comments, null, 2);
            
            case 'csv':
                const headers = ['Author', 'Comment', 'Likes', 'Date', 'Sentiment'];
                const rows = comments.map(c => [
                    c.author,
                    c.textOriginal.replace(/,/g, ';'),
                    c.likes,
                    c.publishedAt,
                    c.sentiment
                ]);
                return [headers, ...rows].map(row => row.join(',')).join('\n');
            
            case 'txt':
                return comments.map(c => 
                    `[${c.author}] (${c.likes} likes): ${c.textOriginal}`
                ).join('\n\n');
            
            default:
                return null;
        }
    }

    /**
     * 获取分析报告
     */
    getAnalyticsReport(videoId) {
        const analytics = this.analytics[videoId];
        if (!analytics) return null;

        return {
            summary: {
                total: analytics.totalComments,
                positive: `${(analytics.sentiment.positive / analytics.totalComments * 100).toFixed(1)}%`,
                engagement: `${analytics.engagementRate}%`,
                avgLikes: analytics.averageLikes
            },
            details: analytics
        };
    }

    /**
     * 搜索评论
     */
    searchComments(query, videoId = null) {
        const results = [];
        const searchQuery = query.toLowerCase();

        const videosToSearch = videoId ? 
            [videoId] : Array.from(this.comments.keys());

        videosToSearch.forEach(vid => {
            const comments = this.comments.get(vid) || [];
            const matches = comments.filter(c => 
                c.textOriginal.toLowerCase().includes(searchQuery) ||
                c.author.toLowerCase().includes(searchQuery)
            );
            
            if (matches.length > 0) {
                results.push({
                    videoId: vid,
                    matches: matches
                });
            }
        });

        return results;
    }

    /**
     * 清除所有数据
     */
    clearAll() {
        this.comments.clear();
        this.analytics = {};
        localStorage.removeItem('youtube_comments_data');
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommentManagerV2;
}



