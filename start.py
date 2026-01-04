#!/usr/bin/env python3
"""
YouTube视频管理工具 - 快速启动脚本
"""

import subprocess
import webbrowser
import time
import sys
import os

def main():
    print("🎬 YouTube视频管理工具启动中...")
    print("=" * 50)
    
    # 检查是否在正确的目录
    if not os.path.exists('index.html'):
        print("❌ 错误：请在项目根目录运行此脚本")
        sys.exit(1)
    
    print("🚀 启动HTTP服务器...")
    print("📍 服务地址: http://localhost:8001")
    print("⏹️  按 Ctrl+C 停止服务")
    print("-" * 50)
    
    try:
        # 启动HTTP服务器
        process = subprocess.Popen(
            [sys.executable, '-m', 'http.server', '8001'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # 等待服务器启动
        time.sleep(2)
        
        # 自动打开浏览器
        print("🌐 正在打开浏览器...")
        webbrowser.open('http://localhost:8001/index.html')
        
        print("✅ 服务器启动成功！")
        print("\n📖 使用说明:")
        print("1. 在页面顶部输入您的YouTube API密钥")
        print("2. 点击'测试API'确保连接正常")
        print("3. 在搜索框中输入关键词或粘贴YouTube链接")
        print("4. 使用'一键复制所有URL'功能复制视频链接")
        print("\n🔑 获取API密钥:")
        print("   访问 https://console.developers.google.com/")
        print("   创建项目并启用 YouTube Data API v3")
        
        # 等待用户中断
        process.wait()
        
    except KeyboardInterrupt:
        print("\n⏹️ 正在停止服务器...")
        process.terminate()
        print("👋 服务器已停止")
        
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()