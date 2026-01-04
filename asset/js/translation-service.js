/**
 * 免费翻译服务
 * 使用MyMemory API提供免费翻译服务（每日5000次调用限制）
 */
class TranslationService {
    constructor() {
        this.apiBaseUrl = 'https://api.mymemory.translated.net/get';
        this.maxTextLength = 500; // 单次翻译最大长度
        this.cache = new Map(); // 翻译缓存
        this.rateLimiter = {
            lastRequest: 0,
            minInterval: 200 // 最小请求间隔(ms)
        };
        
        // 支持的语言
        this.supportedLanguages = {
            'auto': '自动检测',
            'en': 'English',
            'zh': '中文简体',
            'zh-TW': '中文繁体',
            'ja': '日本語',
            'ko': '한국어',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский',
            'ar': 'العربية'
        };
        
        // 使用统计
        this.stats = {
            totalTranslations: 0,
            successful: 0,
            failed: 0,
            cached: 0,
            lastTranslationTime: null
        };
        
        this.loadCache();
    }

    /**
     * 翻译文本
     * @param {string} text - 要翻译的文本
     * @param {string} targetLang - 目标语言代码
     * @param {string} sourceLang - 源语言代码，默认auto
     */
    async translateText(text, targetLang = 'zh', sourceLang = 'auto') {
        if (!text || !text.trim()) {
            throw new Error('翻译文本不能为空');
        }

        const cleanText = text.trim();
        const cacheKey = this.getCacheKey(cleanText, targetLang, sourceLang);
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            this.stats.cached++;
            console.log('📦 使用翻译缓存');
            return this.cache.get(cacheKey);
        }

        // 检查文本长度
        if (cleanText.length > this.maxTextLength) {
            return await this.translateLongText(cleanText, targetLang, sourceLang);
        }

        try {
            // 速率限制
            await this.waitForRateLimit();
            
            // 构建请求参数
            const params = new URLSearchParams({
                q: cleanText,
                langpair: `${sourceLang}|${targetLang}`,
                de: 'your-email@example.com' // 可选的邮箱（提高限额）
            });

            const response = await fetch(`${this.apiBaseUrl}?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`翻译请求失败: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.responseStatus === 200) {
                const result = {
                    originalText: cleanText,
                    translatedText: data.responseData.translatedText,
                    sourceLang: data.responseData.match?.source || sourceLang,
                    targetLang: targetLang,
                    confidence: data.responseData.match?.quality || 0,
                    provider: 'MyMemory',
                    timestamp: new Date().toISOString()
                };

                // 缓存结果
                this.cache.set(cacheKey, result);
                this.saveCache();
                
                // 更新统计
                this.stats.totalTranslations++;
                this.stats.successful++;
                this.stats.lastTranslationTime = new Date();
                
                console.log(`✅ 翻译成功: ${sourceLang} -> ${targetLang}`);
                return result;
            } else {
                throw new Error(data.responseDetails || '翻译失败');
            }

        } catch (error) {
            this.stats.totalTranslations++;
            this.stats.failed++;
            console.error('❌ 翻译失败:', error);
            throw error;
        }
    }

    /**
     * 翻译长文本（分段处理）
     */
    async translateLongText(text, targetLang, sourceLang) {
        const segments = this.splitText(text, this.maxTextLength);
        const translatedSegments = [];
        
        console.log(`📝 分段翻译: ${segments.length} 段`);
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            
            try {
                const result = await this.translateText(segment, targetLang, sourceLang);
                translatedSegments.push(result.translatedText);
                
                // 段间延迟
                if (i < segments.length - 1) {
                    await this.sleep(500);
                }
            } catch (error) {
                console.error(`❌ 第${i + 1}段翻译失败:`, error);
                translatedSegments.push(segment); // 使用原文
            }
        }
        
        return {
            originalText: text,
            translatedText: translatedSegments.join(' '),
            sourceLang: sourceLang,
            targetLang: targetLang,
            confidence: 0.8,
            provider: 'MyMemory (分段)',
            timestamp: new Date().toISOString(),
            segments: segments.length
        };
    }

    /**
     * 批量翻译评论
     * @param {Array} comments - 评论数组
     * @param {string} targetLang - 目标语言
     * @param {Object} options - 选项
     */
    async translateComments(comments, targetLang = 'zh', options = {}) {
        const {
            maxComments = 50,
            interval = 1000,
            onProgress = null,
            skipCached = true
        } = options;

        const commentsToTranslate = comments.slice(0, maxComments);
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        let cachedCount = 0;

        console.log(`🌐 开始批量翻译 ${commentsToTranslate.length} 条评论`);

        for (let i = 0; i < commentsToTranslate.length; i++) {
            const comment = commentsToTranslate[i];
            
            try {
                // 检查是否跳过已翻译的内容
                if (skipCached && comment.translation && comment.translation.targetLang === targetLang) {
                    results.push(comment);
                    cachedCount++;
                    continue;
                }

                const translation = await this.translateText(comment.text, targetLang);
                
                const translatedComment = {
                    ...comment,
                    translation: translation
                };
                
                results.push(translatedComment);
                successCount++;
                
                console.log(`✅ 翻译进度: ${i + 1}/${commentsToTranslate.length}`);

            } catch (error) {
                console.error(`❌ 翻译评论失败: ${comment.author}`, error);
                results.push(comment); // 保留原评论
                failedCount++;
            }

            // 进度回调
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: commentsToTranslate.length,
                    successful: successCount,
                    failed: failedCount,
                    cached: cachedCount,
                    percentage: Math.round(((i + 1) / commentsToTranslate.length) * 100)
                });
            }

            // 间隔延迟
            if (i < commentsToTranslate.length - 1) {
                await this.sleep(interval);
            }
        }
        
        console.log(`🎉 批量翻译完成: 成功${successCount}，失败${failedCount}，缓存${cachedCount}`);
        
        return {
            comments: results,
            stats: {
                total: commentsToTranslate.length,
                successful: successCount,
                failed: failedCount,
                cached: cachedCount
            }
        };
    }

    /**
     * 检测语言
     */
    async detectLanguage(text) {
        if (!text || !text.trim()) {
            return null;
        }

        try {
            const cleanText = text.trim().substring(0, 100); // 只用前100字符检测
            const result = await this.translateText(cleanText, 'en', 'auto');
            return result.sourceLang;
        } catch (error) {
            console.error('❌ 语言检测失败:', error);
            return 'auto';
        }
    }

    /**
     * 获取支持的语言列表
     */
    getSupportedLanguages() {
        return { ...this.supportedLanguages };
    }

    /**
     * 分割长文本
     */
    splitText(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }

        const segments = [];
        let currentPos = 0;

        while (currentPos < text.length) {
            let endPos = currentPos + maxLength;
            
            if (endPos >= text.length) {
                segments.push(text.substring(currentPos));
                break;
            }

            // 尝试在句号、问号、感叹号处分割
            const punctuation = /[.!?。！？]/g;
            let lastPunctuation = -1;
            
            const chunk = text.substring(currentPos, endPos);
            let match;
            
            while ((match = punctuation.exec(chunk)) !== null) {
                lastPunctuation = match.index;
            }
            
            if (lastPunctuation > maxLength * 0.5) {
                endPos = currentPos + lastPunctuation + 1;
            } else {
                // 在空格处分割
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > maxLength * 0.5) {
                    endPos = currentPos + lastSpace;
                }
            }

            segments.push(text.substring(currentPos, endPos));
            currentPos = endPos;
        }

        return segments;
    }

    /**
     * 生成缓存键
     */
    getCacheKey(text, targetLang, sourceLang) {
        const textHash = this.simpleHash(text);
        return `${sourceLang}-${targetLang}-${textHash}`;
    }

    /**
     * 简单哈希函数
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 速率限制
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
        
        if (timeSinceLastRequest < this.rateLimiter.minInterval) {
            const waitTime = this.rateLimiter.minInterval - timeSinceLastRequest;
            await this.sleep(waitTime);
        }
        
        this.rateLimiter.lastRequest = Date.now();
    }

    /**
     * 加载缓存
     */
    loadCache() {
        try {
            const cachedData = localStorage.getItem('translation_cache');
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                this.cache = new Map(parsed);
                console.log(`📦 加载翻译缓存: ${this.cache.size} 条`);
            }
        } catch (error) {
            console.error('加载翻译缓存失败:', error);
            this.cache = new Map();
        }
    }

    /**
     * 保存缓存
     */
    saveCache() {
        try {
            // 限制缓存大小
            if (this.cache.size > 1000) {
                const entries = Array.from(this.cache.entries());
                const recent = entries.slice(-800); // 保留最近的800条
                this.cache = new Map(recent);
            }
            
            const cacheArray = Array.from(this.cache.entries());
            localStorage.setItem('translation_cache', JSON.stringify(cacheArray));
        } catch (error) {
            console.error('保存翻译缓存失败:', error);
        }
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        localStorage.removeItem('translation_cache');
        console.log('🗑️ 翻译缓存已清除');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            supportedLanguages: Object.keys(this.supportedLanguages).length
        };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalTranslations: 0,
            successful: 0,
            failed: 0,
            cached: 0,
            lastTranslationTime: null
        };
    }

    /**
     * 休眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 测试翻译服务
     */
    async testService() {
        try {
            const testText = "Hello, this is a test message.";
            const result = await this.translateText(testText, 'zh', 'en');
            
            return {
                success: true,
                result: result,
                message: '翻译服务测试成功'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '翻译服务测试失败'
            };
        }
    }
}

// 导出类
window.TranslationService = TranslationService;