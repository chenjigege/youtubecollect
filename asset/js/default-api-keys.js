// 默认API密钥配置
// 注意：这是一个示例文件，实际使用时需要替换为真实的API密钥

const DEFAULT_API_KEYS = {
    // 主API密钥（加密存储）
    primary: {
        encrypted: 'QUl6YVN5RGZ2Y0p4TGpzU0xlVHhCV2d5R3A4Tl9fX3V6QjFkR2J1cU9nVW1r',
        description: '主要YouTube Data API v3密钥',
        quota: 10000,
        status: 'active'
    },
    
    // 备用API密钥
    backup: {
        encrypted: 'QUl6YVN5RGZ2Y0p4TGpzU0xlVHhCV2d5R3A4Tl9fX3V6QjFkR2J1cU9nVW1r',
        description: '备用YouTube Data API v3密钥',
        quota: 10000,
        status: 'active'
    }
};

// API密钥轮换配置
const API_KEY_ROTATION = {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24小时
    maxUsage: 8000, // 最大使用量
    fallbackEnabled: true
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULT_API_KEYS, API_KEY_ROTATION };
} else {
    window.DEFAULT_API_KEYS = DEFAULT_API_KEYS;
    window.API_KEY_ROTATION = API_KEY_ROTATION;
}







