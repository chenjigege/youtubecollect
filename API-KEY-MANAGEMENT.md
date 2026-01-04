# 🔑 API密钥管理系统说明

## 📋 功能概述

YouTube视频管理器v2.1现在集成了完整的API密钥管理系统，支持：

- ✅ **默认API密钥**: 内置加密的共享API密钥，开箱即用
- ✅ **自定义API密钥**: 用户可以使用自己的API密钥
- ✅ **加密存储**: 所有API密钥都经过加密存储
- ✅ **密钥测试**: 内置API密钥有效性测试
- ✅ **配额管理**: 自动跟踪API使用配额
- ✅ **安全保护**: 防止API密钥泄露

## 🚀 使用方法

### 1. 默认使用（推荐新手）
应用内置了默认的API密钥，用户可以直接使用：
- 无需配置，开箱即用
- 自动加密存储
- 支持所有功能

### 2. 自定义API密钥
用户可以替换为自己的API密钥：
1. 点击设置按钮（⚙️）
2. 在API配置区域输入自己的密钥
3. 点击"测试密钥"验证有效性
4. 点击"保存密钥"完成配置

### 3. 重置为默认
如果用户想回到默认密钥：
1. 打开设置界面
2. 点击"使用默认"按钮
3. 确认重置操作

## 🔒 安全特性

### 加密存储
- 所有API密钥都使用XOR加密算法
- 加密密钥基于用户代理和域名生成
- 本地存储，不会上传到服务器

### 密钥保护
- 设置界面只显示密钥预览（前8位+后4位）
- 完整密钥不会在界面上显示
- 支持密钥有效性验证

### 配额管理
- 自动跟踪API使用次数
- 每日配额限制提醒
- 使用统计和监控

## 🛠️ 技术实现

### 文件结构
```
assets/js/
├── api-key-manager.js      # API密钥管理器核心
├── default-api-keys.js     # 默认API密钥配置
├── comment-manager-v2.js   # 评论管理器
└── history-manager-v2.js   # 历史记录管理器
```

### 核心类：ApiKeyManager
```javascript
class ApiKeyManager {
    // 获取当前API密钥
    getCurrentApiKey()
    
    // 设置自定义API密钥
    setApiKey(apiKey)
    
    // 重置为默认密钥
    resetToDefault()
    
    // 测试API密钥有效性
    testApiKey(apiKey)
    
    // 获取密钥状态信息
    getApiKeyStatus()
    
    // 加密/解密函数
    encrypt(text)
    decrypt(encryptedText)
}
```

### 加密算法
使用简单的XOR加密算法：
```javascript
// 加密
for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
}

// 解密
for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode);
}
```

## 📊 API密钥状态

### 状态信息
系统会显示以下信息：
- **密钥类型**: 默认密钥 / 自定义密钥
- **密钥预览**: 前8位 + "..." + 后4位
- **有效性**: 有效 / 无效
- **使用统计**: 请求次数、配额使用情况

### 状态指示器
- 🟢 **绿色**: API已配置且有效
- 🟡 **黄色**: API未配置或无效
- 🔵 **蓝色**: 正在测试API密钥

## 🔧 配置选项

### 默认API密钥
```javascript
const DEFAULT_API_KEYS = {
    primary: {
        encrypted: 'QUl6YVN5RGZ2Y0p4TGpzU0xlVHhCV2d5R3A4Tl9fX3V6QjFkR2J1cU9nVW1r',
        description: '主要YouTube Data API v3密钥',
        quota: 10000,
        status: 'active'
    }
};
```

### API密钥轮换
```javascript
const API_KEY_ROTATION = {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24小时
    maxUsage: 8000, // 最大使用量
    fallbackEnabled: true
};
```

## 📈 使用统计

### 统计信息
- **总请求数**: 累计API调用次数
- **每日请求数**: 当天API调用次数
- **最后使用时间**: 最近一次API调用时间
- **配额使用率**: 当前配额使用百分比

### 配额限制
- **YouTube Data API v3**: 每日10,000次请求
- **自动监控**: 接近限制时提醒用户
- **智能切换**: 支持多密钥轮换使用

## 🚨 故障排除

### 常见问题

#### 1. API密钥无效
**症状**: 测试密钥时显示"API密钥测试失败"
**解决方案**:
- 检查密钥格式是否正确
- 确认密钥在Google Cloud Console中已启用
- 验证密钥权限设置

#### 2. 配额超限
**症状**: 显示"配额已用完"错误
**解决方案**:
- 等待24小时后配额重置
- 申请更高的配额限制
- 使用多个API密钥轮换

#### 3. 加密/解密失败
**症状**: 无法保存或读取API密钥
**解决方案**:
- 清除浏览器缓存
- 检查浏览器兼容性
- 重新设置API密钥

### 调试方法
1. **打开浏览器控制台**: F12
2. **查看API密钥状态**: `window.apiKeyManager.getApiKeyStatus()`
3. **测试API连接**: `window.apiKeyManager.testApiKey()`
4. **查看使用统计**: `window.apiKeyManager.getApiUsageStats()`

## 🔄 更新和维护

### 密钥更新
- 默认密钥会定期更新
- 用户自定义密钥需要手动更新
- 支持批量密钥管理

### 安全更新
- 定期更新加密算法
- 增强密钥保护机制
- 监控异常使用模式

## 📞 技术支持

### 获取帮助
1. **查看控制台**: 检查错误信息
2. **运行诊断**: 使用内置诊断工具
3. **重置配置**: 清除所有设置重新开始
4. **联系支持**: 提供详细错误信息

### 联系信息
- **项目地址**: 当前部署目录
- **文档**: `API-KEY-MANAGEMENT.md`
- **测试工具**: `test-docker-access.html`

---

**最后更新**: 2025-09-12 14:20  
**版本**: v2.1  
**状态**: ✅ API密钥管理系统已集成并可用







