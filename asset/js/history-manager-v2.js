/**
 * 搜索历史记录管理器 - 增强版
 * 支持搜索历史、浏览历史、操作历史的记录和分析
 */

class HistoryManagerV2 {
    constructor() {
        this.searchHistory = [];
        this.viewHistory = [];
        this.actionHistory = [];
        this.maxHistoryItems = 1000;
        this.loadFromStorage();
    }

    /**
     * 记录搜索历史
     */
    addSearchHistory(query, type = 'keyword', results = 0) {
        const entry = {
            id: this.generateId(),
            query: query,
            type: type, // keyword, url, channel
            timestamp: new Date().toISOString(),
            results: results,
            source: 'search'
        };

        this.searchHistory.unshift(entry);
        
        // 限制历史记录数量
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveToStorage();
        this.triggerEvent('search-added', entry);
        
        return entry;
    }

    /**
     * 记录视频浏览历史
     */
    addViewHistory(video) {
        const entry = {
            id: this.generateId(),
            videoId: video.id,
            title: video.title,
            channel: video.channel,
            thumbnail: video.thumbnail,
            url: video.url,
            timestamp: new Date().toISOString(),
            duration: video.duration,
            source: 'view'
        };

        // 检查是否已存在，如果存在则更新时间
        const existingIndex = this.viewHistory.findIndex(h => h.videoId === video.id);
        if (existingIndex !== -1) {
            this.viewHistory.splice(existingIndex, 1);
        }

        this.viewHistory.unshift(entry);
        
        if (this.viewHistory.length > this.maxHistoryItems) {
            this.viewHistory = this.viewHistory.slice(0, this.maxHistoryItems);
        }

        this.saveToStorage();
        this.triggerEvent('view-added', entry);
        
        return entry;
    }

    /**
     * 记录操作历史
     */
    addActionHistory(action, details = {}) {
        const entry = {
            id: this.generateId(),
            action: action, // export, import, delete, copy, etc.
            details: details,
            timestamp: new Date().toISOString(),
            source: 'action'
        };

        this.actionHistory.unshift(entry);
        
        if (this.actionHistory.length > this.maxHistoryItems) {
            this.actionHistory = this.actionHistory.slice(0, this.maxHistoryItems);
        }

        this.saveToStorage();
        this.triggerEvent('action-added', entry);
        
        return entry;
    }

    /**
     * 获取搜索建议
     */
    getSearchSuggestions(query = '', limit = 10) {
        if (!query) {
            // 返回最近的搜索
            return this.searchHistory
                .slice(0, limit)
                .map(h => h.query);
        }

        const queryLower = query.toLowerCase();
        const suggestions = new Set();
        
        // 从搜索历史中查找匹配项
        this.searchHistory.forEach(h => {
            if (h.query.toLowerCase().includes(queryLower)) {
                suggestions.add(h.query);
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * 获取热门搜索
     */
    getTopSearches(days = 7, limit = 10) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const searchCounts = {};
        
        this.searchHistory
            .filter(h => new Date(h.timestamp) > cutoffDate)
            .forEach(h => {
                searchCounts[h.query] = (searchCounts[h.query] || 0) + 1;
            });

        return Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query, count]) => ({ query, count }));
    }

    /**
     * 获取最近浏览的视频
     */
    getRecentViews(limit = 20) {
        return this.viewHistory.slice(0, limit);
    }

    /**
     * 获取浏览最多的频道
     */
    getTopChannels(limit = 10) {
        const channelCounts = {};
        
        this.viewHistory.forEach(h => {
            channelCounts[h.channel] = (channelCounts[h.channel] || 0) + 1;
        });

        return Object.entries(channelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([channel, count]) => ({ channel, count }));
    }

    /**
     * 获取活动统计
     */
    getActivityStats(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const stats = {
            searches: 0,
            views: 0,
            actions: 0,
            daily: {},
            hourly: new Array(24).fill(0)
        };

        // 统计搜索
        this.searchHistory
            .filter(h => new Date(h.timestamp) > cutoffDate)
            .forEach(h => {
                stats.searches++;
                this.updateDailyStats(stats.daily, h.timestamp);
                this.updateHourlyStats(stats.hourly, h.timestamp);
            });

        // 统计浏览
        this.viewHistory
            .filter(h => new Date(h.timestamp) > cutoffDate)
            .forEach(h => {
                stats.views++;
                this.updateDailyStats(stats.daily, h.timestamp);
                this.updateHourlyStats(stats.hourly, h.timestamp);
            });

        // 统计操作
        this.actionHistory
            .filter(h => new Date(h.timestamp) > cutoffDate)
            .forEach(h => {
                stats.actions++;
                this.updateDailyStats(stats.daily, h.timestamp);
            });

        return stats;
    }

    /**
     * 更新每日统计
     */
    updateDailyStats(daily, timestamp) {
        const date = timestamp.split('T')[0];
        daily[date] = (daily[date] || 0) + 1;
    }

    /**
     * 更新每小时统计
     */
    updateHourlyStats(hourly, timestamp) {
        const hour = new Date(timestamp).getHours();
        hourly[hour]++;
    }

    /**
     * 搜索历史记录
     */
    searchInHistory(query, type = 'all') {
        const queryLower = query.toLowerCase();
        const results = {
            searches: [],
            views: [],
            actions: []
        };

        if (type === 'all' || type === 'search') {
            results.searches = this.searchHistory.filter(h => 
                h.query.toLowerCase().includes(queryLower)
            );
        }

        if (type === 'all' || type === 'view') {
            results.views = this.viewHistory.filter(h => 
                h.title.toLowerCase().includes(queryLower) ||
                h.channel.toLowerCase().includes(queryLower)
            );
        }

        if (type === 'all' || type === 'action') {
            results.actions = this.actionHistory.filter(h => 
                h.action.toLowerCase().includes(queryLower) ||
                JSON.stringify(h.details).toLowerCase().includes(queryLower)
            );
        }

        return results;
    }

    /**
     * 清除历史记录
     */
    clearHistory(type = 'all', before = null) {
        const cutoffDate = before ? new Date(before) : new Date();

        if (type === 'all' || type === 'search') {
            if (before) {
                this.searchHistory = this.searchHistory.filter(h => 
                    new Date(h.timestamp) > cutoffDate
                );
            } else {
                this.searchHistory = [];
            }
        }

        if (type === 'all' || type === 'view') {
            if (before) {
                this.viewHistory = this.viewHistory.filter(h => 
                    new Date(h.timestamp) > cutoffDate
                );
            } else {
                this.viewHistory = [];
            }
        }

        if (type === 'all' || type === 'action') {
            if (before) {
                this.actionHistory = this.actionHistory.filter(h => 
                    new Date(h.timestamp) > cutoffDate
                );
            } else {
                this.actionHistory = [];
            }
        }

        this.saveToStorage();
        this.triggerEvent('history-cleared', { type, before });
    }

    /**
     * 删除单条历史记录
     */
    deleteHistoryItem(id, type) {
        let deleted = false;

        if (type === 'search') {
            const index = this.searchHistory.findIndex(h => h.id === id);
            if (index !== -1) {
                this.searchHistory.splice(index, 1);
                deleted = true;
            }
        } else if (type === 'view') {
            const index = this.viewHistory.findIndex(h => h.id === id);
            if (index !== -1) {
                this.viewHistory.splice(index, 1);
                deleted = true;
            }
        } else if (type === 'action') {
            const index = this.actionHistory.findIndex(h => h.id === id);
            if (index !== -1) {
                this.actionHistory.splice(index, 1);
                deleted = true;
            }
        }

        if (deleted) {
            this.saveToStorage();
            this.triggerEvent('history-item-deleted', { id, type });
        }

        return deleted;
    }

    /**
     * 导出历史记录
     */
    exportHistory(type = 'all', format = 'json') {
        const data = {
            searchHistory: type === 'all' || type === 'search' ? this.searchHistory : [],
            viewHistory: type === 'all' || type === 'view' ? this.viewHistory : [],
            actionHistory: type === 'all' || type === 'action' ? this.actionHistory : [],
            exportDate: new Date().toISOString()
        };

        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                // 简化的CSV导出
                const rows = [];
                rows.push(['Type', 'Content', 'Timestamp']);
                
                data.searchHistory.forEach(h => {
                    rows.push(['Search', h.query, h.timestamp]);
                });
                
                data.viewHistory.forEach(h => {
                    rows.push(['View', h.title, h.timestamp]);
                });
                
                data.actionHistory.forEach(h => {
                    rows.push(['Action', h.action, h.timestamp]);
                });
                
                return rows.map(row => row.join(',')).join('\n');
            
            default:
                return null;
        }
    }

    /**
     * 导入历史记录
     */
    importHistory(data, merge = true) {
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (merge) {
                // 合并导入
                if (parsed.searchHistory) {
                    this.searchHistory = [...parsed.searchHistory, ...this.searchHistory];
                }
                if (parsed.viewHistory) {
                    this.viewHistory = [...parsed.viewHistory, ...this.viewHistory];
                }
                if (parsed.actionHistory) {
                    this.actionHistory = [...parsed.actionHistory, ...this.actionHistory];
                }
            } else {
                // 替换导入
                if (parsed.searchHistory) {
                    this.searchHistory = parsed.searchHistory;
                }
                if (parsed.viewHistory) {
                    this.viewHistory = parsed.viewHistory;
                }
                if (parsed.actionHistory) {
                    this.actionHistory = parsed.actionHistory;
                }
            }

            // 去重和限制数量
            this.removeDuplicates();
            this.limitHistorySize();
            
            this.saveToStorage();
            this.triggerEvent('history-imported', { merge });
            
            return true;
        } catch (error) {
            console.error('导入历史记录失败:', error);
            return false;
        }
    }

    /**
     * 去除重复项
     */
    removeDuplicates() {
        // 搜索历史去重（保留最新的）
        const seenSearches = new Set();
        this.searchHistory = this.searchHistory.filter(h => {
            const key = h.query;
            if (seenSearches.has(key)) {
                return false;
            }
            seenSearches.add(key);
            return true;
        });

        // 浏览历史去重（保留最新的）
        const seenViews = new Set();
        this.viewHistory = this.viewHistory.filter(h => {
            const key = h.videoId;
            if (seenViews.has(key)) {
                return false;
            }
            seenViews.add(key);
            return true;
        });
    }

    /**
     * 限制历史记录大小
     */
    limitHistorySize() {
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }
        if (this.viewHistory.length > this.maxHistoryItems) {
            this.viewHistory = this.viewHistory.slice(0, this.maxHistoryItems);
        }
        if (this.actionHistory.length > this.maxHistoryItems) {
            this.actionHistory = this.actionHistory.slice(0, this.maxHistoryItems);
        }
    }

    /**
     * 保存到本地存储
     */
    saveToStorage() {
        try {
            const data = {
                searchHistory: this.searchHistory,
                viewHistory: this.viewHistory,
                actionHistory: this.actionHistory,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('youtube_history_data', JSON.stringify(data));
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }

    /**
     * 从本地存储加载
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('youtube_history_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.searchHistory = data.searchHistory || [];
                this.viewHistory = data.viewHistory || [];
                this.actionHistory = data.actionHistory || [];
                return true;
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
        return false;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 触发事件
     */
    triggerEvent(eventName, data) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`history:${eventName}`, { detail: data }));
        }
    }

    /**
     * 获取统计摘要
     */
    getSummary() {
        return {
            totalSearches: this.searchHistory.length,
            totalViews: this.viewHistory.length,
            totalActions: this.actionHistory.length,
            uniqueVideos: new Set(this.viewHistory.map(h => h.videoId)).size,
            uniqueChannels: new Set(this.viewHistory.map(h => h.channel)).size,
            lastSearch: this.searchHistory[0]?.timestamp,
            lastView: this.viewHistory[0]?.timestamp,
            lastAction: this.actionHistory[0]?.timestamp
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManagerV2;
}













