TokenVault：自用 2FA/TOTP 管理（Next.js App Router + Supabase/Postgres）。

## 本地启动

### 1) 初始化 Supabase

在 Supabase 的 SQL Editor 执行 `supabase/init.sql`（可重复执行，用于初始化与无损更新表/函数等）。

### 2) 配置环境变量

复制 `.env.example` 为 `.env.local`，填入 3 个变量：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用）
- `ADMIN_PASSWORD`（登录密码，同时用于加密存储的 secret；改密码需迁移）

### 3) 启动

```bash
pnpm dev
```

打开 `http://localhost:3000`，首次访问会跳转到 `/login`。

## 脚本

```bash
pnpm lint
pnpm build
pnpm start
```
