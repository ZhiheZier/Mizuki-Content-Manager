# Mizuki Content Manager

Mizuki Content Manager 是一个面向 Mizuki 博客的本地可视化内容管理器。它会读取你选择的 Mizuki 代码仓库，自动判断内容是否与代码分离，并提供结构化编辑、文件树编辑、图片管理和博客预览能力。

## 功能

- 自动识别 Mizuki 内容模式。
- 支持代码与内容一体的 Mizuki 仓库。
- 支持通过 `.env` 中的 `CONTENT_DIR` 读取内容分离仓库。
- 支持编辑关于、日记、友情链接、博客文章、项目、时间线、技能、设备、AI 工具、追番、相册等内容。
- 提供类似 VS Code 侧边栏的文件树，可直接编辑 Markdown 和 TypeScript 文件。
- 支持日记、设备、追番、相册图片的本地上传、预览、删除。
- 支持 Mizuki 允许的外链图片：
  - 日记图片可以同时使用本地路径和外链地址；
  - 设备图片和追番封面可以使用本地路径或外链地址；
  - 相册遵循 Mizuki 文档，只能选择本地模式或外链模式之一。
- 可启动所选 Mizuki 仓库的 `pnpm dev`，并在管理器内打开预览。
- 记录修改会先保留在页面中，点击 `保存记录` 后才会真正写入文件。

## 环境要求

- Node.js 20 或更高版本
- pnpm 9 或更高版本
- 本机已有一个 Mizuki 代码仓库

如果本机没有启用 pnpm，可以先执行：

```bash
corepack enable
```

## 安装

```bash
pnpm install
```

## 运行

```bash
pnpm dev
```

打开：

```text
http://127.0.0.1:5173
```

在左侧输入 Mizuki 代码仓库路径，然后点击 `确定`。

## 内容模式识别

管理器会读取所选 Mizuki 仓库下的 `.env` 文件：

- 如果 `ENABLE_CONTENT_SYNC=true`，则视为内容分离模式，内容目录来自 `CONTENT_DIR`，默认是 `./content`。
- 否则视为内容一体模式，读取 Mizuki 仓库内的这些目录：
  - `src/data`
  - `src/content/posts`
  - `src/content/spec`
  - `public/images`

仓库路径会保存在本地 `.mcm-config.json` 中。这个文件只用于本机配置，已被 `.gitignore` 忽略。

## 常用脚本

```bash
pnpm dev       # 启动内容管理器
pnpm check     # 运行 Astro 类型检查
pnpm build     # 类型检查并构建
pnpm preview   # 本地预览构建结果
pnpm start     # 运行 standalone 构建产物
```

## 说明

项目早期曾使用 Gradio 原型实现，现在维护的主版本是 `src/` 下的 Astro 应用。
