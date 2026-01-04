/**
 * 数据分析管理器
 * 提供视频数据、评论数据、用户行为的深度分析
 */

class AnalyticsManager {
    constructor() {
        this.videos = [];
        this.comments = new Map();
        this.history = null;
        this.charts = {};
    }

    /**
     * 初始化分析数据
     */
    initialize(videos, commentManager, historyManager) {
        this.videos = videos;
        this.comments = commentManager.comments;
        this.history = historyManager;
        this.generateAnalytics();
    }

    /**
     * 生成综合分析
     */
    generateAnalytics() {
        return {
            overview: this.getOverviewStats(),
            videoAnalytics: this.getVideoAnalytics(),
            channelAnalytics: this.getChannelAnalytics(),
            timeAnalytics: this.getTimeAnalytics(),
            engagementAnalytics: this.getEngagementAnalytics(),
            contentAnalytics: this.getContentAnalytics(),
            trendAnalytics: this.getTrendAnalytics(),
            performanceMetrics: this.getPerformanceMetrics()
        };
    }

    /**
     * 获取概览统计
     */
    getOverviewStats() {
        const totalVideos = this.videos.length;
        const totalViews = this.videos.reduce((sum, v) => sum + (v.views || 0), 0);
        const totalLikes = this.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
        const totalComments = this.videos.reduce((sum, v) => sum + (v.comments || 0), 0);
        
        // 计算平均值
        const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
        const avgLikes = totalVideos > 0 ? Math.round(totalLikes / totalVideos) : 0;
        const avgComments = totalVideos > 0 ? Math.round(totalComments / totalVideos) : 0;
        
        // 计算增长率（模拟数据）
        const viewsGrowth = this.calculateGrowthRate(totalViews);
        const likesGrowth = this.calculateGrowthRate(totalLikes);
        const commentsGrowth = this.calculateGrowthRate(totalComments);

        return {
            totalVideos,
            totalViews,
            totalLikes,
            totalComments,
            avgViews,
            avgLikes,
            avgComments,
            viewsGrowth,
            likesGrowth,
            commentsGrowth,
            engagementRate: this.calculateOverallEngagementRate(),
            viralityScore: this.calculateViralityScore()
        };
    }

    /**
     * 获取视频分析
     */
    getVideoAnalytics() {
        // 按观看数排序
        const topByViews = [...this.videos]
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // 按点赞数排序
        const topByLikes = [...this.videos]
            .sort((a, b) => b.likes - a.likes)
            .slice(0, 10);

        // 按评论数排序
        const topByComments = [...this.videos]
            .sort((a, b) => b.comments - a.comments)
            .slice(0, 10);

        // 按互动率排序
        const topByEngagement = [...this.videos]
            .map(v => ({
                ...v,
                engagementRate: this.calculateVideoEngagementRate(v)
            }))
            .sort((a, b) => b.engagementRate - a.engagementRate)
            .slice(0, 10);

        // 视频时长分布
        const durationDistribution = this.analyzeDurationDistribution();

        // 视频类别分析
        const categoryAnalysis = this.analyzeCategoryDistribution();

        return {
            topByViews,
            topByLikes,
            topByComments,
            topByEngagement,
            durationDistribution,
            categoryAnalysis,
            performanceScore: this.calculatePerformanceScores()
        };
    }

    /**
     * 获取频道分析
     */
    getChannelAnalytics() {
        const channelStats = new Map();

        this.videos.forEach(video => {
            const channel = video.channel;
            if (!channelStats.has(channel)) {
                channelStats.set(channel, {
                    name: channel,
                    videos: 0,
                    totalViews: 0,
                    totalLikes: 0,
                    totalComments: 0,
                    avgViews: 0,
                    avgLikes: 0,
                    avgComments: 0
                });
            }

            const stats = channelStats.get(channel);
            stats.videos++;
            stats.totalViews += video.views || 0;
            stats.totalLikes += video.likes || 0;
            stats.totalComments += video.comments || 0;
        });

        // 计算平均值
        channelStats.forEach(stats => {
            stats.avgViews = Math.round(stats.totalViews / stats.videos);
            stats.avgLikes = Math.round(stats.totalLikes / stats.videos);
            stats.avgComments = Math.round(stats.totalComments / stats.videos);
            stats.engagementRate = this.calculateChannelEngagementRate(stats);
        });

        // 转换为数组并排序
        const topChannels = Array.from(channelStats.values())
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, 20);

        return {
            totalChannels: channelStats.size,
            topChannels,
            channelDistribution: this.getChannelDistribution(channelStats),
            channelGrowth: this.analyzeChannelGrowth(channelStats)
        };
    }

    /**
     * 获取时间分析
     */
    getTimeAnalytics() {
        const publishDates = this.videos.map(v => new Date(v.publishedAt));
        
        // 按小时分布
        const hourlyDistribution = new Array(24).fill(0);
        publishDates.forEach(date => {
            hourlyDistribution[date.getHours()]++;
        });

        // 按星期分布
        const weeklyDistribution = new Array(7).fill(0);
        publishDates.forEach(date => {
            weeklyDistribution[date.getDay()]++;
        });

        // 按月份分布
        const monthlyDistribution = {};
        publishDates.forEach(date => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyDistribution[key] = (monthlyDistribution[key] || 0) + 1;
        });

        // 发布频率分析
        const publishingFrequency = this.analyzePublishingFrequency(publishDates);

        // 最佳发布时间
        const optimalPublishTime = this.findOptimalPublishTime();

        return {
            hourlyDistribution,
            weeklyDistribution,
            monthlyDistribution,
            publishingFrequency,
            optimalPublishTime,
            timeZoneAnalysis: this.analyzeTimeZones(publishDates)
        };
    }

    /**
     * 获取互动分析
     */
    getEngagementAnalytics() {
        // 点赞率分析
        const likeRates = this.videos.map(v => ({
            title: v.title,
            likeRate: v.views > 0 ? (v.likes / v.views * 100) : 0
        }));

        // 评论率分析
        const commentRates = this.videos.map(v => ({
            title: v.title,
            commentRate: v.views > 0 ? (v.comments / v.views * 100) : 0
        }));

        // 互动趋势
        const engagementTrend = this.analyzeEngagementTrend();

        // 评论情感分析
        const sentimentAnalysis = this.analyzeSentiments();

        // 用户参与度分析
        const userParticipation = this.analyzeUserParticipation();

        return {
            avgLikeRate: this.calculateAverageLikeRate(),
            avgCommentRate: this.calculateAverageCommentRate(),
            likeRates,
            commentRates,
            engagementTrend,
            sentimentAnalysis,
            userParticipation,
            viralPotential: this.assessViralPotential()
        };
    }

    /**
     * 获取内容分析
     */
    getContentAnalytics() {
        // 标题词云
        const titleWordCloud = this.generateTitleWordCloud();

        // 标题长度分析
        const titleLengthAnalysis = this.analyzeTitleLength();

        // 描述分析
        const descriptionAnalysis = this.analyzeDescriptions();

        // 标签分析
        const tagAnalysis = this.analyzeTags();

        // 内容类型分析
        const contentTypeAnalysis = this.analyzeContentTypes();

        return {
            titleWordCloud,
            titleLengthAnalysis,
            descriptionAnalysis,
            tagAnalysis,
            contentTypeAnalysis,
            contentQualityScore: this.calculateContentQualityScore()
        };
    }

    /**
     * 获取趋势分析
     */
    getTrendAnalytics() {
        // 观看趋势
        const viewsTrend = this.analyzeViewsTrend();

        // 增长预测
        const growthPrediction = this.predictGrowth();

        // 季节性分析
        const seasonalityAnalysis = this.analyzeSeasonality();

        // 病毒式传播检测
        const viralDetection = this.detectViralContent();

        return {
            viewsTrend,
            growthPrediction,
            seasonalityAnalysis,
            viralDetection,
            emergingTopics: this.identifyEmergingTopics(),
            declineTrends: this.identifyDeclineTrends()
        };
    }

    /**
     * 获取性能指标
     */
    getPerformanceMetrics() {
        return {
            roi: this.calculateROI(),
            efficiency: this.calculateEfficiency(),
            reach: this.calculateReach(),
            impact: this.calculateImpact(),
            quality: this.calculateQualityScore(),
            consistency: this.calculateConsistency(),
            growth: this.calculateGrowthMetrics(),
            benchmarks: this.compareToBenchmarks()
        };
    }

    // ===== 辅助方法 =====

    /**
     * 计算增长率
     */
    calculateGrowthRate(currentValue) {
        // 模拟计算，实际应基于历史数据
        const randomGrowth = (Math.random() * 20 - 5).toFixed(1);
        return parseFloat(randomGrowth);
    }

    /**
     * 计算整体互动率
     */
    calculateOverallEngagementRate() {
        const totalViews = this.videos.reduce((sum, v) => sum + v.views, 0);
        const totalEngagements = this.videos.reduce((sum, v) => 
            sum + v.likes + v.comments, 0
        );
        
        return totalViews > 0 ? 
            ((totalEngagements / totalViews) * 100).toFixed(2) : 0;
    }

    /**
     * 计算病毒传播分数
     */
    calculateViralityScore() {
        const scores = this.videos.map(v => {
            const viewScore = Math.min(v.views / 1000000, 1) * 40;
            const likeScore = Math.min(v.likes / 100000, 1) * 30;
            const commentScore = Math.min(v.comments / 10000, 1) * 30;
            return viewScore + likeScore + commentScore;
        });

        return scores.length > 0 ? 
            (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    }

    /**
     * 计算视频互动率
     */
    calculateVideoEngagementRate(video) {
        if (video.views === 0) return 0;
        return ((video.likes + video.comments) / video.views * 100).toFixed(2);
    }

    /**
     * 计算频道互动率
     */
    calculateChannelEngagementRate(stats) {
        if (stats.totalViews === 0) return 0;
        return ((stats.totalLikes + stats.totalComments) / stats.totalViews * 100).toFixed(2);
    }

    /**
     * 分析时长分布
     */
    analyzeDurationDistribution() {
        const ranges = {
            'short': 0,    // < 5 min
            'medium': 0,   // 5-15 min
            'long': 0,     // 15-30 min
            'veryLong': 0  // > 30 min
        };

        this.videos.forEach(v => {
            const duration = this.parseDurationToMinutes(v.duration);
            if (duration < 5) ranges.short++;
            else if (duration < 15) ranges.medium++;
            else if (duration < 30) ranges.long++;
            else ranges.veryLong++;
        });

        return ranges;
    }

    /**
     * 解析时长为分钟
     */
    parseDurationToMinutes(duration) {
        if (!duration) return 0;
        const parts = duration.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 60 + parts[1] + parts[2] / 60;
        } else if (parts.length === 2) {
            return parts[0] + parts[1] / 60;
        }
        return 0;
    }

    /**
     * 生成标题词云
     */
    generateTitleWordCloud() {
        const words = {};
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

        this.videos.forEach(v => {
            const titleWords = v.title.toLowerCase().split(/\s+/);
            titleWords.forEach(word => {
                if (word.length > 3 && !stopWords.has(word)) {
                    words[word] = (words[word] || 0) + 1;
                }
            });
        });

        return Object.entries(words)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([word, count]) => ({ text: word, value: count }));
    }

    /**
     * 导出分析报告
     */
    exportReport(format = 'json') {
        const report = this.generateAnalytics();
        const timestamp = new Date().toISOString();

        switch (format) {
            case 'json':
                return JSON.stringify({ report, timestamp }, null, 2);
            
            case 'html':
                return this.generateHTMLReport(report, timestamp);
            
            case 'markdown':
                return this.generateMarkdownReport(report, timestamp);
            
            default:
                return null;
        }
    }

    /**
     * 生成HTML报告
     */
    generateHTMLReport(report, timestamp) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>YouTube数据分析报告</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #ff0000; }
        h2 { color: #666; margin-top: 30px; }
        .stat { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #ff0000; }
        .stat-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <h1>YouTube数据分析报告</h1>
    <p>生成时间: ${new Date(timestamp).toLocaleString()}</p>
    
    <h2>概览统计</h2>
    <div class="stats">
        <div class="stat">
            <div class="stat-value">${report.overview.totalVideos}</div>
            <div class="stat-label">总视频数</div>
        </div>
        <div class="stat">
            <div class="stat-value">${this.formatNumber(report.overview.totalViews)}</div>
            <div class="stat-label">总观看数</div>
        </div>
        <div class="stat">
            <div class="stat-value">${this.formatNumber(report.overview.totalLikes)}</div>
            <div class="stat-label">总点赞数</div>
        </div>
        <div class="stat">
            <div class="stat-value">${report.overview.engagementRate}%</div>
            <div class="stat-label">互动率</div>
        </div>
    </div>
    
    <h2>TOP视频（按观看数）</h2>
    <table>
        <thead>
            <tr>
                <th>标题</th>
                <th>频道</th>
                <th>观看数</th>
                <th>点赞数</th>
                <th>评论数</th>
            </tr>
        </thead>
        <tbody>
            ${report.videoAnalytics.topByViews.slice(0, 10).map(v => `
                <tr>
                    <td>${v.title}</td>
                    <td>${v.channel}</td>
                    <td>${this.formatNumber(v.views)}</td>
                    <td>${this.formatNumber(v.likes)}</td>
                    <td>${this.formatNumber(v.comments)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
        `;
    }

    /**
     * 生成Markdown报告
     */
    generateMarkdownReport(report, timestamp) {
        return `# YouTube数据分析报告

生成时间: ${new Date(timestamp).toLocaleString()}

## 概览统计

- **总视频数**: ${report.overview.totalVideos}
- **总观看数**: ${this.formatNumber(report.overview.totalViews)}
- **总点赞数**: ${this.formatNumber(report.overview.totalLikes)}
- **总评论数**: ${this.formatNumber(report.overview.totalComments)}
- **平均观看数**: ${this.formatNumber(report.overview.avgViews)}
- **互动率**: ${report.overview.engagementRate}%
- **病毒传播分数**: ${report.overview.viralityScore}/100

## TOP 10 视频（按观看数）

| 标题 | 频道 | 观看数 | 点赞数 | 评论数 |
|------|------|--------|--------|--------|
${report.videoAnalytics.topByViews.slice(0, 10).map(v => 
`| ${v.title} | ${v.channel} | ${this.formatNumber(v.views)} | ${this.formatNumber(v.likes)} | ${this.formatNumber(v.comments)} |`
).join('\n')}

## 频道分析

- **总频道数**: ${report.channelAnalytics.totalChannels}

### TOP频道
${report.channelAnalytics.topChannels.slice(0, 5).map((c, i) => 
`${i + 1}. **${c.name}**: ${c.videos}个视频, ${this.formatNumber(c.totalViews)}次观看`
).join('\n')}

## 时间分析

### 发布时间分布
- 最活跃发布时间: ${report.timeAnalytics.optimalPublishTime || '待分析'}

## 互动分析

- **平均点赞率**: ${report.engagementAnalytics.avgLikeRate}%
- **平均评论率**: ${report.engagementAnalytics.avgCommentRate}%
- **病毒潜力评分**: ${report.engagementAnalytics.viralPotential}/100

---

*报告由YouTube视频管理工具自动生成*
        `;
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // 占位方法，返回模拟数据
    analyzeCategoryDistribution() { return {}; }
    calculatePerformanceScores() { return []; }
    getChannelDistribution() { return {}; }
    analyzeChannelGrowth() { return {}; }
    analyzePublishingFrequency() { return {}; }
    findOptimalPublishTime() { return '20:00'; }
    analyzeTimeZones() { return {}; }
    calculateAverageLikeRate() { return 5.2; }
    calculateAverageCommentRate() { return 0.8; }
    analyzeEngagementTrend() { return {}; }
    analyzeSentiments() { return { positive: 60, neutral: 30, negative: 10 }; }
    analyzeUserParticipation() { return {}; }
    assessViralPotential() { return 75; }
    analyzeTitleLength() { return { avg: 45, min: 10, max: 100 }; }
    analyzeDescriptions() { return {}; }
    analyzeTags() { return {}; }
    analyzeContentTypes() { return {}; }
    calculateContentQualityScore() { return 82; }
    analyzeViewsTrend() { return {}; }
    predictGrowth() { return {}; }
    analyzeSeasonality() { return {}; }
    detectViralContent() { return []; }
    identifyEmergingTopics() { return []; }
    identifyDeclineTrends() { return []; }
    calculateROI() { return 0; }
    calculateEfficiency() { return 0; }
    calculateReach() { return 0; }
    calculateImpact() { return 0; }
    calculateQualityScore() { return 0; }
    calculateConsistency() { return 0; }
    calculateGrowthMetrics() { return {}; }
    compareToBenchmarks() { return {}; }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
}













