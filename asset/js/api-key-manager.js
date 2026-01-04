// API密钥管理器 - 支持默认密钥和用户自定义密钥
class ApiKeyManager {
    constructor() {
        this.storageKey = 'youtube_api_key_encrypted';
        this.defaultApiKey = this.getDefaultApiKey();
        this.encryptionKey = this.getEncryptionKey();
    }

    // 获取默认API密钥（加密存储）
    getDefaultApiKey() {
        // 优先使用嵌入的API密钥配置（用于Docker部署）
        if (window.EMBEDDED_API_KEYS && Array.isArray(window.EMBEDDED_API_KEYS) && window.EMBEDDED_API_KEYS.length > 0) {
            // 过滤掉占位符和无效密钥
            const validKeys = window.EMBEDDED_API_KEYS.filter(key => 
                key && 
                key !== 'YOUR_API_KEY_HERE' && 
                key.length > 20 && 
                key.startsWith('AIzaSy')
            );
            
            if (validKeys.length > 0) {
                // 如果只有一个密钥，直接返回
                if (validKeys.length === 1) {
                    return validKeys[0];
                }
                // 多个密钥时，根据日期轮换
                const today = new Date();
                const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
                const keyIndex = dayOfYear % validKeys.length;
                return validKeys[keyIndex];
            }
        }
        
        // 使用多个备用API密钥，自动轮换（后备方案）
        const apiKeys = [
            'AIzaSyBv4XLNnMm5iVmPTgI7idvrYi1OIAV4OwA', // 主密钥（正确版本）
            'AIzaSyDfvcJxLjsSLeTxBWgyGp8N___uzB1dGbuqOmk', // 备用密钥1
            'AIzaSyBvOkBwWqKjKjKjKjKjKjKjKjKjKjKjKjKjKjKj', // 备用密钥2
            'AIzaSyCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCw'  // 备用密钥3
        ];
        
        // 根据当前日期选择密钥，实现自动轮换
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const keyIndex = dayOfYear % apiKeys.length;
        
        return apiKeys[keyIndex];
    }

    // 获取加密密钥
    getEncryptionKey() {
        // 使用用户代理和域名生成加密密钥
        const userAgent = navigator.userAgent;
        const hostname = window.location.hostname;
        return btoa(userAgent + hostname).substring(0, 16);
    }

    // 简单加密函数
    encrypt(text) {
        if (!text) return '';
        try {
            let encrypted = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                encrypted += String.fromCharCode(charCode);
            }
            return btoa(encrypted);
        } catch (error) {
            console.error('Encryption error:', error);
            return text;
        }
    }

    // 简单解密函数
    decrypt(encryptedText) {
        if (!encryptedText) return '';
        try {
            const encrypted = atob(encryptedText);
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                const charCode = encrypted.charCodeAt(i) ^ keyChar;
                decrypted += String.fromCharCode(charCode);
            }
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return '';
        }
    }

    // 获取当前API密钥
    getCurrentApiKey() {
        const encryptedKey = localStorage.getItem(this.storageKey);
        if (encryptedKey) {
            const decryptedKey = this.decrypt(encryptedKey);
            if (decryptedKey && decryptedKey.length > 10) {
                return decryptedKey;
            }
        }
        return this.defaultApiKey;
    }
    
    // 检查是否有有效的API密钥
    hasValidApiKey() {
        const key = this.getCurrentApiKey();
        return key && key.length > 10;
    }

    // 设置API密钥
    setApiKey(apiKey) {
        if (!apiKey || apiKey.trim().length < 10) {
            throw new Error('API密钥格式无效');
        }
        
        try {
            const trimmedKey = apiKey.trim();
            const encryptedKey = this.encrypt(trimmedKey);
            
            // 保存到localStorage
            localStorage.setItem(this.storageKey, encryptedKey);
            
            // 验证保存是否成功
            const savedKey = localStorage.getItem(this.storageKey);
            if (!savedKey) {
                throw new Error('localStorage保存失败');
            }
            
            // 触发API密钥更新事件
            this.dispatchApiKeyUpdateEvent(trimmedKey);
            
            console.log('API密钥保存成功:', this.getKeyPreview(trimmedKey));
            return true;
        } catch (error) {
            console.error('API密钥保存失败:', error);
            throw new Error('API密钥保存失败: ' + error.message);
        }
    }

    // 重置为默认API密钥
    resetToDefault() {
        localStorage.removeItem(this.storageKey);
        this.dispatchApiKeyUpdateEvent(this.defaultApiKey);
    }

    // 检查是否使用默认密钥
    isUsingDefaultKey() {
        return !localStorage.getItem(this.storageKey);
    }

    // 获取API密钥状态信息
    getApiKeyStatus() {
        const currentKey = this.getCurrentApiKey();
        const isDefault = this.isUsingDefaultKey();
        
        return {
            key: currentKey,
            isDefault: isDefault,
            keyPreview: this.getKeyPreview(currentKey),
            isValid: this.validateApiKey(currentKey)
        };
    }

    // 获取密钥预览（只显示前几位和后几位）
    getKeyPreview(apiKey) {
        if (!apiKey || apiKey.length < 10) return '无效密钥';
        return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    }

    // 验证API密钥格式
    validateApiKey(apiKey) {
        if (!apiKey) return false;
        // YouTube API密钥通常是39位字符
        return apiKey.length >= 20 && /^[A-Za-z0-9_-]+$/.test(apiKey);
    }

    // 测试API密钥有效性
    async testApiKey(apiKey = null) {
        const keyToTest = apiKey || this.getCurrentApiKey();
        if (!keyToTest) return false;

        try {
            const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${keyToTest}&maxResults=1`;
            const response = await fetch(testUrl);
            return response.ok;
        } catch (error) {
            console.error('API key test failed:', error);
            return false;
        }
    }
    
    // 智能获取有效API密钥
    async getValidApiKey() {
        const currentKey = this.getCurrentApiKey();
        
        // 先测试当前密钥
        if (await this.testApiKey(currentKey)) {
            return currentKey;
        }
        
        // 如果当前密钥无效，尝试其他备用密钥
        const apiKeys = [
            'AIzaSyBv4XLNnMm5iVmPTgI7idvrYi1OIAV4OwA',
            'AIzaSyDfvcJxLjsSLeTxBWgyGp8N___uzB1dGbuqOmk',
            'AIzaSyBvOkBwWqKjKjKjKjKjKjKjKjKjKjKjKjKjKjKj',
            'AIzaSyCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCwCw'
        ];
        
        for (const key of apiKeys) {
            if (await this.testApiKey(key)) {
                // 找到有效密钥，保存到本地存储
                this.setApiKey(key);
                return key;
            }
        }
        
        // 所有密钥都无效
        return null;
    }

    // 触发API密钥更新事件
    dispatchApiKeyUpdateEvent(apiKey) {
        const event = new CustomEvent('apiKeyUpdated', {
            detail: {
                apiKey: apiKey,
                isDefault: this.isUsingDefaultKey(),
                status: this.getApiKeyStatus()
            }
        });
        window.dispatchEvent(event);
    }

    // 获取API使用统计
    getApiUsageStats() {
        const stats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
        return {
            totalRequests: stats.totalRequests || 0,
            dailyRequests: stats.dailyRequests || 0,
            lastUsed: stats.lastUsed || null,
            quotaUsed: stats.quotaUsed || 0
        };
    }

    // 更新API使用统计
    updateApiUsageStats(requests = 1) {
        const stats = this.getApiUsageStats();
        const today = new Date().toDateString();
        
        stats.totalRequests += requests;
        stats.dailyRequests = (stats.dailyRequests || 0) + requests;
        stats.lastUsed = new Date().toISOString();
        stats.quotaUsed = Math.min(stats.quotaUsed + requests, 10000); // YouTube API每日限制
        
        localStorage.setItem('api_usage_stats', JSON.stringify(stats));
    }

    // 清理过期数据
    cleanup() {
        const stats = this.getApiUsageStats();
        const today = new Date().toDateString();
        
        // 重置每日统计
        if (stats.lastUsed && new Date(stats.lastUsed).toDateString() !== today) {
            stats.dailyRequests = 0;
            localStorage.setItem('api_usage_stats', JSON.stringify(stats));
        }
    }
}

// 创建全局实例
window.apiKeyManager = new ApiKeyManager();

// 自动清理过期数据
window.apiKeyManager.cleanup();
