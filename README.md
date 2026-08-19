# Mizuki Content Manager

Mizuki Content Manager 是一个面向 Mizuki 博客的本地可视化内容管理器。它读取你选择的 Mizuki 代码仓库，自动判断内容是否与代码分离，并提供结构化编辑、文件树编辑、图片管理、日志记录和博客预览能力。

## 功能

- 自动识别 Mizuki 内容模式：代码内容一体，或通过 `.env` 配置的内容分离。
- 支持编辑关于、日记、友情链接、博客文章、项目、时间线、技能、设备、AI 工具、追番、相册等内容。
- 提供类似 VS Code 左侧侧边栏的内容文件树，可直接编辑 Markdown 和 TypeScript 文件。
- 支持博客封面、博客正文图片、日记图片、设备图片、追番封面、相册图片的上传、预览和删除。
- 支持 Mizuki 允许的外链图片：
  - 日记图片可以同时使用本地图片和外链图片。
  - 博客封面可以使用本地图片或外链图片。
  - 相册按 Mizuki 规则选择本地模式或外链模式，单个相册不要混用两种模式。
- 可在管理器里启动所选 Mizuki 代码仓库的 `pnpm dev`，并打开预览抽屉。
- 记录修改会先保留在页面中，只有点击 `保存记录` 后才会真正写入文件。
- 左侧日志会写入项目的 `logs/` 目录，便于追踪操作。

## 环境要求

- Node.js 20 或更高版本
- pnpm 9 或更高版本
- 本机已经有一个 Mizuki 代码仓库

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

## 内容模式

管理器只需要选择 Mizuki 代码仓库路径。确认后，它会读取代码仓库根目录下的 `.env`：

- 如果 `ENABLE_CONTENT_SYNC=true`，视为内容分离模式。
- 如果没有开启内容同步，视为代码内容一体模式。
- 内容分离时，内容目录来自 `CONTENT_DIR`，默认是 `./content`。

### 代码内容一体

内容直接来自 Mizuki 代码仓库内的目录：

```text
Mizuki/
  src/
    data/
    content/
      posts/
      spec/
  public/
    images/
```

### 内容分离

内容分离时，Mizuki 代码仓库通常会在启动 `pnpm dev` 时根据 `.env` 自动克隆或同步远程内容仓库到 `CONTENT_DIR` 指向的目录。常见结构如下：

```text
Mizuki/
  .env
  content/
    data/
      diary.ts
      friends.ts
      projects.ts
      timeline.ts
      skills.ts
      devices.ts
      ai-tools.ts
      anime.ts
    posts/
      hello-world.md
      guide/
        hello-world.md
    spec/
      about.md
      friends.md
    images/
      posts/
      diary/
      device/
      anime/
      albums/
        my-album/
          info.json
          cover.webp
          photo-1.webp
```

`.env` 示例：

```dotenv
ENABLE_CONTENT_SYNC=true
CONTENT_REPO_URL=https://github.com/your-name/your-content-repo.git
CONTENT_DIR=./content
```

在内容分离模式下要特别注意：Mizuki 的 `pnpm dev` 可能会从远程内容仓库同步并覆盖本地内容。因此管理器在启动预览前会检查内容仓库的 Git 状态。如果有未提交或未推送内容，建议先点击左侧 `推送`，或自行提交推送后再启动预览。

## 图片目录约定

管理器会尽量写入 Mizuki 内容仓库约定的图片位置：

- 博客封面：`images/posts`
- 博客正文图片：`images/posts`
- 日记图片：`images/diary`
- 设备图片：`images/device`
- 追番封面：`images/anime`
- 本地相册图片：`images/albums/<album-name>`

本地相册的封面由相册目录里的 `cover.*` 图片决定，例如 `cover.webp` 或 `cover.jpg`。`info.json` 主要记录相册标题、描述、日期、加密等元信息；其中的 `cover` 字段只用于外链相册模式。

删除记录时，管理器会尝试删除该记录引用的本地 `images/` 图片。外链图片只会移除引用，不会删除远程文件。

## 本地配置

仓库路径会保存到本地 `.mcm-config.json`，这个文件只用于本机配置，已被 `.gitignore` 忽略。

## 常用脚本

```bash
pnpm dev       # 启动内容管理器
pnpm check     # 运行 Astro 类型检查
pnpm build     # 类型检查并构建
pnpm preview   # 本地预览构建结果
pnpm start     # 运行 standalone 构建产物
```

## 说明

项目早期曾使用 Gradio 原型实现，现在维护的主版本是 `src/` 下的 Astro 应用。旧的 Gradio 入口不再作为主流程使用。
