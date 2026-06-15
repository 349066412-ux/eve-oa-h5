# EVE军团OA - H5 Demo

无尽星河 EVE 军团 OA 系统（H5 网页版）

## 🚀 在线演示

**Demo 地址：** https://[你的用户名].github.io/eve-oa-h5/

## 📱 功能特性

- ✅ 战损登记（上传截图 → AI识别 → 自动填表）
- ✅ 出勤记录
- ✅ 军团资产管理
- ✅ 个人积分查询
- ✅ 公告栏

## 🛠️ 技术栈

- 前端：HTML5 + CSS3 + 原生 JavaScript
- 后端：待接入（豆包AI + 飞书多维表格API）
- 部署：GitHub Pages（免费）

## 📦 本地运行

1. 克隆仓库
```bash
git clone https://github.com/[你的用户名]/eve-oa-h5.git
cd eve-oa-h5
```

2. 启动本地服务器（Live Server）
3. 浏览器打开 `http://localhost:5500`

## 🎮 Demo 模式

当前为 **Demo 模式**（模拟数据）：
- 数据保存在浏览器本地（localStorage）
- 点击按钮有反应，但数据是假的
- AI识别功能模拟（2秒延迟）

## 🔧 切换真实模式

1. 部署后端代理（Vercel / Cloudflare Workers）
2. 修改 `js/config.js` 中的 API 配置
3. 将 `js/app.js` 中的 `DEMO_MODE` 改为 `false`

## 📝 后续开发

- [ ] 接入真实豆包AI识别
- [ ] 连接飞书多维表格
- [ ] 实现用户权限管理
- [ ] 添加数据可视化图表

## 📄 授权

MIT License

---

**开发者：** QClaw  
**日期：** 2026-06-15
