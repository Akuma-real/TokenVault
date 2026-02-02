# 仓库指南（Repository Guidelines）

TokenVault 是一个用于**自用 2FA/TOTP 管理**的 Next.js（App Router）项目：管理账户、取码、导入导出与**一次性分享链接**。数据统一走 **Supabase(Postgres)**；EdgeOne/Cloudflare 只负责运行前端与 `/api/*`。

## 目标落地（约束）

- 分享链接：**严格一次性**，默认 `300s`，允许自定义（建议 `30s~3600s`）。
- 鉴权：`ADMIN_PASSWORD` 登录（HttpOnly Cookie 会话）；脚本访问用 `Authorization: Bearer <API_KEY>`（**后台生成**、存数据库（建议存哈希））。

## 项目结构与模块组织

- `app/`：页面与路由（包含 `app/api/*`）。
- `lib/`：通用逻辑（加密、TOTP、Supabase 封装等）。别名 `@/*` 指向仓库根目录。
- `components/`：shadcn/ui 组件（由 `shadcn` 命令生成）。
- `public/`：静态资源。
- 配置：`components.json`（shadcn/ui）、`eslint.config.mjs`、`tsconfig.json`、`next.config.ts`。

## 构建、开发与 shadcn/ui

- `pnpm dev` / `pnpm build` / `pnpm start` / `pnpm lint`
- shadcn：`npx shadcn@latest init`，`npx shadcn@latest add button`
  - 示例：`import { Button } from "@/components/ui/button";`

## 一次性分享（必须遵守）

- 预览器防护：`GET /s/<token>` **不消费**；用户点击后 `POST /api/share/consume` 才消费。
- 强一致一次性：消费必须走 Postgres **原子更新**（建议 Supabase RPC `consume_share_token`）。
- 分享页与消费接口返回：`Cache-Control: no-store`（可选 `X-Robots-Tag: noindex`）。

## API 约定（最小集合）

- 鉴权：`POST /api/auth/login`、`POST /api/auth/logout`（可选 `GET /api/auth/me`）。
- 账户：`GET/POST/PATCH/DELETE /api/accounts`（`/:id`）。
- 取码：`GET /api/totp/:id` → `{ code, ttl }`。
- 分享：`POST /api/share`（创建）与 `POST /api/share/consume`（消费，失败返回 `410 Gone`）。
- 导入导出：`POST /api/import/csv`、`GET /api/export/csv`。

## 安全与配置提示

- `SUPABASE_SERVICE_ROLE_KEY` **只在边缘环境**，绝不进入浏览器（会绕过 RLS）。
- 最小环境变量（仅 3 个）：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_PASSWORD`。
- `API_KEY` 不用环境变量：由后台生成并写入数据库（建议存哈希），脚本用 `Authorization: Bearer ...`。
- 任何 SQL 迁移/批量导入前先备份；避免提交 `.next/` 等生成产物与无意改动 `pnpm-lock.yaml`。
