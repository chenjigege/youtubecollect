# 🔑 API密钥配置指南

## 📋 问题说明

您遇到的"API key not valid"错误是因为应用需要有效的YouTube Data API v3密钥才能正常工作。

## 🚀 解决方案

### 方法1: 配置您自己的API密钥（推荐）

#### 步骤1: 获取API密钥
1. **访问Google Cloud Console**
   - 打开 [https://console.developers.google.com/](https://console.developers.google.com/)

2. **创建新项目**
   - 点击"选择项目" → "新建项目"
   - 输入项目名称（如"YouTube Manager"）
   - 点击"创建"

3. **启用YouTube Data API v3**
   - 在左侧菜单选择"API和服务" → "库"
   - 搜索"YouTube Data API v3"
   - 点击API名称，然后点击"启用"

4. **创建API密钥**
   - 选择"API和服务" → "凭据"
   - 点击"创建凭据" → "API密钥"
   - 复制生成的API密钥（类似：`AIzaSy...`）

#### 步骤2: 在应用中配置
1. **打开应用**: 访问 http://localhost:8081
2. **点击设置按钮**: 右上角的⚙️图标
3. **输入API密钥**: 在"YouTube API Key"输入框中粘贴您的密钥
4. **测试密钥**: 点击"测试密钥"按钮验证
5. **保存配置**: 点击"保存密钥"完成配置

### 方法2: 使用示例密钥（临时测试）

如果您只是想测试应用功能，可以使用以下示例密钥：
```
AIzaSyDfvcJxLjsSLeTxBWgyGp8N___uzB1dGbuqOmk
```

**注意**: 这是一个示例密钥，可能不是有效的，建议使用您自己申请的密钥。

## 🔧 配置验证

### 检查API状态
- **绿色指示器**: API已配置且有效
- **红色指示器**: API未配置或无效
- **黄色指示器**: API配置中

### 测试功能
1. **搜索视频**: 输入关键词搜索
2. **获取评论**: 点击"获取评论"按钮
3. **复制URL**: 选择视频后点击"复制URL"

## 🚨 常见问题

### Q: API密钥无效怎么办？
**A**: 请检查：
- 密钥格式是否正确（通常以`AIzaSy`开头）
- 是否已启用YouTube Data API v3
- 项目是否已正确创建

### Q: 配额超限怎么办？
**A**: YouTube Data API v3每日有10,000次请求限制：
- 等待24小时后配额重置
- 申请更高的配额限制
- 优化使用频率

### Q: 如何保护API密钥安全？
**A**: 
- 不要在公开场所分享API密钥
- 定期轮换API密钥
- 使用应用内置的加密存储功能

## 📊 API使用统计

应用会自动跟踪您的API使用情况：
- **总请求数**: 累计API调用次数
- **每日请求数**: 当天API调用次数
- **配额使用率**: 当前配额使用百分比

## 🎯 最佳实践

### 1. 密钥管理
- 使用您自己的API密钥
- 定期检查配额使用情况
- 妥善保管密钥信息

### 2. 使用优化
- 避免频繁的API调用
- 合理使用搜索筛选条件
- 批量处理评论获取

### 3. 安全保护
- 不要分享API密钥
- 使用HTTPS访问应用
- 定期更新密钥

## 📞 技术支持

### 如果仍有问题
1. **检查控制台**: 按F12查看错误信息
2. **重新配置**: 清除浏览器缓存后重新配置
3. **联系支持**: 提供详细的错误信息

### 有用的链接
- [Google Cloud Console](https://console.developers.google.com/)
- [YouTube Data API v3文档](https://developers.google.com/youtube/v3)
- [API配额和限制](https://developers.google.com/youtube/v3/getting-started#quota)

---

**配置完成后，您就可以正常使用YouTube视频管理器的所有功能了！** 🎉







