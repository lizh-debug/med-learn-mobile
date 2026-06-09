@AGENTS.md

# med-learn-mobile

Expo SDK 54 模块化医学学习 App。正在进行 UI 升级：从 3 Tab（骨架/今天/锚点）迁移到 4 Tab（仪表盘/知识网络/临床推理/我的）。

## 🎨 当前任务：UI 重设计

完整的 UI 改造方案在 `UI-REDESIGN-PLAN.md` — **每次改动前务必先阅读该文件**。

核心变化：
- 色彩：iOS 默认蓝 → 暖铜学术色系（铜色 #C8865D，宣纸白 #FAF7F2，墨色 #1C1C2A）
- Tab：骨架/今天/锚点 → 仪表盘/知识网络/临床推理/我的
- 风格：Markdown 浏览器 → 医学知识驾驶舱

## 常用命令
- `npx expo start` — 启动开发服务器
- `npx expo start --web` — Web 模式
- `npx tsc --noEmit` — TypeScript 检查

## 架构要点
- expo-router 文件路由，所有页面在 `app/` 下
- 文件存储：`src/lib/fileStore.ts` — 平台自适应（native expo-file-system / web Map）
- Markdown 解析：`src/lib/markdownParser.ts` — wiki 链接 `[[path|display]]` 解析
- 状态管理：`src/store/useAppStore.ts` — Zustand，含 skeletonRefreshKey 刷新机制
- 路径规范化：`n(path)` 自动追加 `.md` 后缀
- 主题系统：`src/theme/` — colors / typography / spacing / shadows / decorations

## 关键组件
- `SkeletonTree.tsx` — 4 层骨架树，解析 wiki 链接 + 📖 速通锚点
- `CardView.tsx` — 卡片阅读，编辑/删除按钮，反向链接面板
- `CardEditor.tsx` — 卡片编辑，[[ 自动补全
- `AnchorEditor.tsx` — 锚点 4 段式编辑（一句话/鉴别矩阵/反向追溯/关联骨架）
- `WikiLinkText.tsx` — 智能链接路由（骨架→skeleton，锚点→anchor，总入口→overview）
- `BacklinksList.tsx` — 反向链接交互面板
- `GraphView.tsx` — 知识图谱力导向图（canvas/WebView）
- `AIChatFAB.tsx` / `AIChatPanel.tsx` — AI 聊天助手

## 数据格式
- 骨架：`骨架/{系统名}.md`，4 层 = 🟢基础 / 🟡桥梁 / 🔴临床 / 🔵前沿
- 卡片：`卡片/{系统名}/{节点名}.md`，带 YAML frontmatter
- 锚点：`临床锚点/{症状|体征|检查异常}/{名称}.md`
- 预设数据：`src/assets/presetData/`
