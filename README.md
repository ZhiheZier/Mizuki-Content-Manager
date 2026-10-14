# Mizuki Content Manager

Mizuki Content Manager 是一个面向 Mizuki 博客的本地内容管理器，正在迁移到在博客界面直接编辑内容的模式。目前提供仓库启动器和博客工作区，自动识别内容模式，并在本机启动博客预览。

## 功能

- 自动识别 Mizuki 内容模式：代码内容一体，或通过 `.env` 配置的内容分离。
- 记住代码仓库路径，在启动前检查分离内容仓库的 Git 状态。
- 在管理器里启动所选 Mizuki 代码仓库的 `pnpm dev`，并进入全宽博客工作区。
- 返回启动页会检查博客状态，运行中显示 `进入博客`，避免重复启动。
- 启动页支持明暗模式与主题色设置。
- 日志写入项目的 `logs/` 目录，便于追踪操作。
- 内容读写、记录和图片管理后端保留，后续接入博客页面上的编辑窗口。

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

首页是新的启动界面：填写 Mizuki 代码仓库路径并点击 `确定`，管理器会自动识别内容模式并记住路径。点击 `启动并进入博客` 后进入全宽博客工作区。

内容分离模式会在启动前检查内容仓库 Git 状态，有未提交或未推送内容时会阻止启动，可点击 `提交并推送内容` 后重新检查。

博客页面上的直接编辑按钮尚未接入。原有独立内容编辑器和 `/editor` 页面已删除。

启动页参考 Mizuki 的主题配色、圆角导航栏与按钮样式，使用纯色布局和 Mizuki 导航图标，支持明暗切换及主题色设置。Zen Maru Gothic 字体从本地加载，字体许可证位于 `public/theme/OFL.txt`。

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
- 项目封面：`images/projects`
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
