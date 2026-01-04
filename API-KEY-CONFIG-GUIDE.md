# 🔑 API密钥配置说明 - Docker部署版本

## 📋 配置步骤

### 1. 编辑API密钥配置文件

打开 `api-key-config.js` 文件，将您的YouTube API密钥填入：

```javascript
window.EMBEDDED_API_KEYS = [
    // 将 'YOUR_API_KEY_HERE' 替换为您的真实API密钥
    'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    
    // 可以添加多个备用密钥（可选）
    // 'AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
];
```

### 2. 获取YouTube API密钥

如果您还没有API密钥，请按以下步骤获取：

1. 访问 [Google Cloud Console](https://console.developers.google.com/)
2. 创建新项目或选择现有项目
3. 启用 **YouTube Data API v3**
4. 创建API密钥（凭据 → 创建凭据 → API密钥）
5. 复制生成的API密钥（格式类似：`AIzaSy...`）

### 3. 构建Docker镜像

配置好API密钥后，构建Docker镜像：

```bash
docker-compose build
```

或者使用Docker命令：

```bash
docker build -t youtube-video-manager:v2.1.0 .
```

### 4. 启动容器

```bash
docker-compose up -d
```

## 🔒 安全说明

- ✅ API密钥会被封装到Docker镜像中
- ✅ 内网用户无需单独配置密钥
- ✅ 密钥仅在浏览器本地存储，不会上传到服务器
- ⚠️ 请注意保护您的API密钥配额

## 📝 注意事项

1. **密钥格式**：确保密钥以 `AIzaSy` 开头，长度至少20个字符
2. **多个密钥**：可以配置多个密钥，系统会自动轮换使用
3. **占位符**：不要保留 `YOUR_API_KEY_HERE` 占位符
4. **重新构建**：修改密钥后需要重新构建Docker镜像

## 🚀 快速部署

1. 编辑 `api-key-config.js`，填入您的API密钥
2. 运行 `docker-compose build`
3. 运行 `docker-compose up -d`
4. 访问 http://localhost:8081

## 🔍 验证配置

部署后，打开浏览器控制台（F12），应该能看到：

```
已自动使用嵌入的API密钥: AIzaSyXX...XXXX
```

如果没有看到此消息，请检查：
- API密钥格式是否正确
- api-key-config.js 文件是否被正确复制到镜像中
- 浏览器控制台是否有错误信息

## 📞 故障排除

### 问题1：API密钥未生效
- 检查 `api-key-config.js` 文件格式是否正确
- 确认密钥没有包含多余的空格或引号
- 清除浏览器缓存后重试

### 问题2：构建失败
- 确认 `api-key-config.js` 文件存在于项目根目录
- 检查Dockerfile是否正确复制了该文件

### 问题3：密钥无效
- 在Google Cloud Console中验证API密钥是否有效
- 确认已启用YouTube Data API v3
- 检查API密钥配额是否用完



