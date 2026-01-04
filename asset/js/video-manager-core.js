/**
 * YouTube视频管理核心模块
 * 整合搜索、管理、评论等功能
 */

class YouTubeVideoManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.videos = [];
        this.selectedVideos = new Set();
        this.comments = new Map();
        this.searchHistory = [];
        this.viewHistory = [];
        this.nextPageToken = null;
        
        this.init();
    }

    /**
     * 初始化模块
     */
    init() {
        this.loadFromStorage();
        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索相关
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        // 一键复制按钮
        const copyAllBtn = document.getElementById('copyAllUrls');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => this.copyAllUrls());
        }
    }

    /**
     * 执行视频搜索
     */
    async performSearch() {
        const query = document.getElementById('searchInput')?.value?.trim();
        if (!query) return;

        if (!this.apiKey) {
            this.showError('请先配置API密钥');
            return;
        }

        const maxResults = parseInt(document.getElementById('maxResults')?.value || 50);
        const orderBy = document.getElementById('searchOrder')?.value || 'relevance';
        const publishedAfter = document.getElementById('publishedAfter')?.value || '';
        const publishedBefore = document.getElementById('publishedBefore')?.value || '';
        
        // 显示加载状态
        this.showLoading(true);
        this.clearSearchResults();

        try {
            // 添加到搜索历史
            this.addSearchHistory(query, 'keyword');

            // 执行搜索 - 分批获取以突破API限制
            const allResults = await this.searchVideosWithPagination(query, maxResults, orderBy, publishedAfter, publishedBefore);
            
            // 显示结果
            this.displaySearchResults(allResults);
            
            // 更新搜索建议
            this.updateSearchSuggestions();

        } catch (error) {
            console.error('Search error:', error);
            this.showError('搜索失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 分页搜索视频 - 突破API限制
     */
    async searchVideosWithPagination(query, maxResults, orderBy, publishedAfter, publishedBefore) {
        const allResults = [];
        const maxResultsPerRequest = 50; // YouTube API单次请求最大数量
        const totalRequests = Math.ceil(maxResults / maxResultsPerRequest);
        
        for (let i = 0; i < totalRequests; i++) {
            const currentMaxResults = Math.min(maxResultsPerRequest, maxResults - allResults.length);
            if (currentMaxResults <= 0) break;
            
            try {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${currentMaxResults}&order=${orderBy}&key=${this.apiKey}${publishedAfter ? `&publishedAfter=${publishedAfter}` : ''}${publishedBefore ? `&publishedBefore=${publishedBefore}` : ''}${i > 0 ? `&pageToken=${this.nextPageToken}` : ''}`
                );

                if (!response.ok) {
                    throw new Error('API request failed');
                }

                const data = await response.json();
                const items = data.items || [];
                
                // 获取详细视频信息
                if (items.length > 0) {
                    const videoDetails = await this.getVideoDetails(items);
                    allResults.push(...videoDetails);
                }
                
                // 保存下一页token
                this.nextPageToken = data.nextPageToken;
                
                // 如果没有更多结果，退出循环
                if (!this.nextPageToken) break;
                
                // 避免API限制，添加延迟
                if (i < totalRequests - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`Search request ${i + 1} failed:`, error);
                break;
            }
        }
        
        return allResults;
    }

    /**
     * 获取视频详细信息
     */
    async getVideoDetails(searchResults) {
        const videoIds = searchResults.map(item => item.id.videoId).join(',');
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`
        );

        if (!response.ok) {
            throw new Error('Failed to get video details');
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * 显示搜索结果
     */
    displaySearchResults(items) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<p class="text-center text-white/60 py-8">没有找到相关视频</p>';
            return;
        }

        container.innerHTML = `
            <div class="mb-4 text-sm text-white/60">
                找到 ${items.length} 个视频
            </div>
            ${items.map(item => {
                // 安全检查
                const viewCount = item.statistics?.viewCount || 0;
                const likeCount = item.statistics?.likeCount || 0;
                const commentCount = item.statistics?.commentCount || 0;

                return `
                    <div class="glass-card p-4">
                        <img src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}" 
                            class="w-full h-48 object-cover rounded-lg mb-3">
                        <h3 class="font-medium text-sm mb-1 line-clamp-2">${item.snippet.title}</h3>
                        <p class="text-xs text-white/60 mb-3">${item.snippet.channelTitle}</p>
                        <div class="flex justify-between text-xs text-white/60 mb-3">
                            <span>${this.formatNumber(viewCount)} 观看</span>
                            <span>${this.formatNumber(likeCount)} 点赞</span>
                            <span>${this.formatNumber(commentCount)} 评论</span>
                        </div>
                        <button onclick="videoManager.addVideo('${item.id}')" 
                            class="w-full btn-gradient text-white rounded-lg py-2 text-sm">
                            添加到管理
                        </button>
                    </div>
                `;
            }).join('')}
        `;
    }

    /**
     * 添加视频到管理列表
     */
    async addVideo(videoId) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${this.apiKey}`
            );

            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const video = this.formatVideoData(data.items[0]);
                
                // 检查是否已存在
                if (!this.videos.find(v => v.id === video.id)) {
                    this.videos.push(video);
                    this.saveToStorage();
                    
                    // 添加到查看历史
                    this.addViewHistory(video);
                    
                    this.showSuccess('视频已添加');
                    this.refreshVideoList();
                } else {
                    this.showWarning('视频已存在');
                }
            }
        } catch (error) {
            console.error('Add video error:', error);
            this.showError('添加失败');
        }
    }

    /**
     * 格式化视频数据
     */
    formatVideoData(item) {
        return {
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            thumbnail: item.snippet.thumbnails.medium.url,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            duration: item.contentDetails.duration,
            views: parseInt(item.statistics?.viewCount || 0),
            likes: parseInt(item.statistics?.likeCount || 0),
            comments: parseInt(item.statistics?.commentCount || 0),
            url: `https://www.youtube.com/watch?v=${item.id}`,
            status: 'pending', // 待处理
            addedAt: new Date().toISOString()
        };
    }

    /**
     * 刷新视频列表
     */
    refreshVideoList() {
        const container = document.getElementById('videoList');
        if (!container) return;

        if (this.videos.length === 0) {
            container.innerHTML = '<p class="text-center text-white/60 py-8">还没有添加视频</p>';
            return;
        }

        container.innerHTML = `
            <div class="mb-4 flex justify-between items-center">
                <span class="text-sm text-white/60">共 ${this.videos.length} 个视频</span>
                <div class="flex gap-2">
                    <button onclick="videoManager.selectAll()" class="px-3 py-1 text-xs bg-blue-600 text-white rounded">
                        全选
                    </button>
                    <button onclick="videoManager.deselectAll()" class="px-3 py-1 text-xs bg-gray-600 text-white rounded">
                        取消全选
                    </button>
                    <button onclick="videoManager.fetchCommentsForSelected()" class="px-3 py-1 text-xs bg-green-600 text-white rounded">
                        批量获取评论
                    </button>
                </div>
            </div>
            ${this.videos.map(video => `
                <div class="panel p-4 flex items-center gap-4">
                    <input type="checkbox" class="w-5 h-5" 
                        ${this.selectedVideos.has(video.id) ? 'checked' : ''}
                        onchange="videoManager.toggleVideoSelection('${video.id}')">
                    <img src="${video.thumbnail}" alt="${video.title}" 
                        class="w-24 h-16 object-cover rounded">
                    <div class="flex-1">
                        <h3 class="font-medium text-sm">${video.title}</h3>
                        <p class="text-xs text-white/60">${video.channel}</p>
                        <span class="inline-block px-2 py-1 text-xs rounded-full ${this.getStatusClass(video.status)}">
                            ${this.getStatusText(video.status)}
                        </span>
                    </div>
                    <div class="text-right text-xs text-white/60">
                        <div>${this.formatNumber(video.views)} 观看</div>
                        <div>${this.formatNumber(video.likes)} 点赞</div>
                        <div>${this.formatNumber(video.comments)} 评论</div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="videoManager.fetchComments('${video.id}')" 
                            class="px-3 py-1 text-xs bg-blue-600 text-white rounded">
                            获取评论
                        </button>
                        <button onclick="videoManager.removeVideo('${video.id}')" 
                            class="px-3 py-1 text-xs bg-red-600 text-white rounded">
                            删除
                        </button>
                    </div>
                </div>
            `).join('')}
        `;

        this.updateStats();
    }

    /**
     * 批量获取评论
     */
    async fetchCommentsForSelected() {
        if (this.selectedVideos.size === 0) {
            this.showWarning('请先选择视频');
            return;
        }

        const selectedVideos = this.videos.filter(v => this.selectedVideos.has(v.id));
        const totalVideos = selectedVideos.length;
        let completedCount = 0;
        let failedCount = 0;

        this.showSuccess(`开始为 ${totalVideos} 个视频获取评论...`);

        for (const video of selectedVideos) {
            try {
                video.status = 'processing';
                this.refreshVideoList();

                await this.fetchComments(video.id);
                completedCount++;

                // 避免API限制，添加延迟
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Failed to fetch comments for ${video.id}:`, error);
                video.status = 'failed';
                failedCount++;
            }
        }

        this.refreshVideoList();
        this.showSuccess(`批量获取完成！成功: ${completedCount}, 失败: ${failedCount}`);
    }

    /**
     * 获取评论
     */
    async fetchComments(videoId) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch comments');
            }

            const data = await response.json();
            const comments = data.items || [];

            // 存储评论
            this.comments.set(videoId, comments);
            
            // 更新视频状态
            const video = this.videos.find(v => v.id === videoId);
            if (video) {
                video.status = 'completed';
                video.commentCount = comments.length;
                this.saveToStorage();
            }

            this.showSuccess(`成功获取 ${comments.length} 条评论`);
            
            // 显示评论
            this.displayComments(videoId, comments);

        } catch (error) {
            console.error('Fetch comments error:', error);
            this.showError('获取评论失败');
            throw error;
        }
    }

    /**
     * 显示评论
     */
    displayComments(videoId, comments) {
        const container = document.getElementById('commentsList');
        if (!container) return;

        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        container.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-medium mb-2">${video.title}</h3>
                <p class="text-sm text-white/60">共 ${comments.length} 条评论</p>
            </div>
            ${comments.map(comment => `
                <div class="glass-card p-3 mb-3">
                    <div class="flex items-start gap-3">
                        <img src="${comment.snippet.topLevelComment.snippet.authorProfileImageUrl}" 
                            class="w-8 h-8 rounded-full">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-medium text-sm">${comment.snippet.topLevelComment.snippet.authorDisplayName}</span>
                                <span class="text-xs text-white/60">${this.formatDate(comment.snippet.topLevelComment.snippet.publishedAt)}</span>
                            </div>
                            <p class="text-sm">${comment.snippet.topLevelComment.snippet.textDisplay}</p>
                            <div class="flex items-center gap-4 mt-2 text-xs text-white/60">
                                <span>👍 ${this.formatNumber(comment.snippet.topLevelComment.snippet.likeCount || 0)}</span>
                                <span>💬 ${this.formatNumber(comment.snippet.totalReplyCount || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    /**
     * 一键复制所有URL
     */
    async copyAllUrls() {
        const urls = this.videos.map(v => v.url).join('\n');
        
        try {
            await navigator.clipboard.writeText(urls);
            this.showSuccess(`成功复制 ${this.videos.length} 个视频链接`);
        } catch (error) {
            // 备用方法
            const textArea = document.createElement('textarea');
            textArea.value = urls;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess(`成功复制 ${this.videos.length} 个视频链接`);
        }
    }

    /**
     * 复制选中的URL
     */
    async copySelectedUrls() {
        if (this.selectedVideos.size === 0) {
            this.showWarning('请先选择视频');
            return;
        }

        const urls = this.videos
            .filter(v => this.selectedVideos.has(v.id))
            .map(v => v.url)
            .join('\n');

        try {
            await navigator.clipboard.writeText(urls);
            this.showSuccess(`成功复制 ${this.selectedVideos.size} 个视频链接`);
        } catch (error) {
            // 备用方法
            const textArea = document.createElement('textarea');
            textArea.value = urls;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess(`成功复制 ${this.selectedVideos.size} 个视频链接`);
        }
    }

    /**
     * 切换视频选择状态
     */
    toggleVideoSelection(videoId) {
        if (this.selectedVideos.has(videoId)) {
            this.selectedVideos.delete(videoId);
        } else {
            this.selectedVideos.add(videoId);
        }
        this.updateStats();
    }

    /**
     * 全选/取消全选
     */
    selectAll() {
        this.videos.forEach(v => this.selectedVideos.add(v.id));
        this.refreshVideoList();
    }

    deselectAll() {
        this.selectedVideos.clear();
        this.refreshVideoList();
    }

    /**
     * 删除视频
     */
    removeVideo(videoId) {
        if (confirm('确定要删除这个视频吗？')) {
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.selectedVideos.delete(videoId);
            this.comments.delete(videoId);
            this.saveToStorage();
            this.refreshVideoList();
            this.showSuccess('视频已删除');
        }
    }

    /**
     * 删除选中的视频
     */
    deleteSelected() {
        if (this.selectedVideos.size === 0) {
            this.showWarning('请先选择视频');
            return;
        }

        if (confirm(`确定要删除选中的 ${this.selectedVideos.size} 个视频吗？`)) {
            this.videos = this.videos.filter(v => !this.selectedVideos.has(v.id));
            this.selectedVideos.clear();
            this.saveToStorage();
            this.refreshVideoList();
            this.showSuccess('选中的视频已删除');
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalVideos = document.getElementById('totalVideos');
        const totalViews = document.getElementById('totalViews');
        const totalLikes = document.getElementById('totalLikes');
        const selectedCount = document.getElementById('selectedCount');

        if (totalVideos) totalVideos.textContent = this.videos.length;
        if (totalViews) totalViews.textContent = this.formatNumber(
            this.videos.reduce((sum, v) => sum + v.views, 0)
        );
        if (totalLikes) totalLikes.textContent = this.formatNumber(
            this.videos.reduce((sum, v) => sum + v.likes, 0)
        );
        if (selectedCount) selectedCount.textContent = this.selectedVideos.size;
    }

    /**
     * 导出数据
     */
    exportData(format = 'json') {
        const dataToExport = this.videos.filter(v => 
            this.selectedVideos.size === 0 || this.selectedVideos.has(v.id)
        );

        let content, filename, mimeType;

        switch (format) {
            case 'txt':
                content = dataToExport.map(v => v.url).join('\n');
                filename = `youtube-videos-${new Date().toISOString().split('T')[0]}.txt`;
                mimeType = 'text/plain';
                break;
            case 'csv':
                content = this.convertToCSV(dataToExport);
                filename = `youtube-videos-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;
            default:
                content = JSON.stringify(dataToExport, null, 2);
                filename = `youtube-videos-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccess(`成功导出 ${dataToExport.length} 个视频数据`);
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        const headers = ['标题', '频道', '观看数', '点赞数', '评论数', '发布时间', 'URL'];
        const rows = data.map(v => [
            v.title,
            v.channel,
            v.views,
            v.likes,
            v.comments,
            v.publishedAt,
            v.url
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * 搜索历史管理
     */
    addSearchHistory(query, type) {
        // 检查是否已存在相同查询
        const existingIndex = this.searchHistory.findIndex(item => item.query === query);
        if (existingIndex !== -1) {
            // 如果已存在，更新时间和次数
            this.searchHistory[existingIndex].timestamp = new Date().toISOString();
            this.searchHistory[existingIndex].count = (this.searchHistory[existingIndex].count || 1) + 1;
        } else {
            // 如果不存在，添加新记录
            this.searchHistory.unshift({
                query,
                type,
                timestamp: new Date().toISOString(),
                count: 1
            });
        }
        
        // 限制历史记录数量
        if (this.searchHistory.length > 100) {
            this.searchHistory = this.searchHistory.slice(0, 100);
        }
        
        this.saveToStorage();
    }

    addViewHistory(video) {
        this.viewHistory.unshift({
            videoId: video.id,
            title: video.title,
            timestamp: new Date().toISOString()
        });
        
        if (this.viewHistory.length > 100) {
            this.viewHistory = this.viewHistory.slice(0, 100);
        }
        
        this.saveToStorage();
    }

    /**
     * 更新搜索建议
     */
    updateSearchSuggestions() {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;

        const recentSearches = this.searchHistory.slice(0, 8);
        
        if (recentSearches.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="mb-2 text-xs text-white/60">最近搜索:</div>
            <div class="flex flex-wrap gap-2">
                ${recentSearches.map(item => `
                    <button onclick="videoManager.repeatSearch('${item.query}')" 
                        class="px-3 py-1 text-xs bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
                        ${item.query} ${item.count > 1 ? `(${item.count})` : ''}
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * 重复搜索
     */
    repeatSearch(query) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = query;
            this.performSearch();
        }
    }

    /**
     * 工具函数
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
        
        return date.toLocaleDateString('zh-CN');
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
            'processing': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
            'completed': 'bg-green-600/20 text-green-400 border-green-600/30',
            'failed': 'bg-red-600/20 text-red-400 border-red-600/30'
        };
        return classes[status] || classes.pending;
    }

    getStatusText(status) {
        const texts = {
            'pending': '待处理',
            'processing': '处理中',
            'completed': '已完成',
            'failed': '失败'
        };
        return texts[status] || '待处理';
    }

    /**
     * 存储管理
     */
    saveToStorage() {
        localStorage.setItem('youtube_videos', JSON.stringify(this.videos));
        localStorage.setItem('youtube_comments', JSON.stringify(Array.from(this.comments.entries())));
        localStorage.setItem('youtube_search_history', JSON.stringify(this.searchHistory));
        localStorage.setItem('youtube_view_history', JSON.stringify(this.viewHistory));
    }

    loadFromStorage() {
        try {
            this.videos = JSON.parse(localStorage.getItem('youtube_videos') || '[]');
            const commentsData = JSON.parse(localStorage.getItem('youtube_comments') || '[]');
            this.comments = new Map(commentsData);
            this.searchHistory = JSON.parse(localStorage.getItem('youtube_search_history') || '[]');
            this.viewHistory = JSON.parse(localStorage.getItem('youtube_view_history') || '[]');
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }

    /**
     * UI状态管理
     */
    showLoading(show) {
        const loading = document.getElementById('searchLoading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
    }

    clearSearchResults() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = '';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-red-600'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * 设置API密钥
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('youtube_api_key', apiKey);
    }

    /**
     * 清除缓存
     */
    clearCache() {
        if (confirm('确定要清除所有缓存数据吗？')) {
            localStorage.clear();
            this.videos = [];
            this.selectedVideos.clear();
            this.comments.clear();
            this.searchHistory = [];
            this.viewHistory = [];
            this.refreshVideoList();
            this.showSuccess('缓存已清除');
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeVideoManager;
}
