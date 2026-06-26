# Supabase 配置（物品整理独立项目）

**Project URL:** `https://liedowqqnzrklygdaqkw.supabase.co`  
**Project ref:** `liedowqqnzrklygdaqkw`

## 环境变量

`web/.env.local`（本地开发，不进 git）：

```
VITE_SUPABASE_URL=https://liedowqqnzrklygdaqkw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # Dashboard → Settings → API → Publishable key
VITE_HOUSEHOLD_EMAIL=969117727@qq.com       # 可选，默认已是此邮箱
```

生产构建见 [`deploy-github-pages.md`](./deploy-github-pages.md)（GitHub Actions 自动部署；本地 build 用同一套 `.env.local`）。

## 家庭账号（Supabase Auth）

**无公开注册**。仅在 Dashboard 手动创建 1 个家庭账号：

1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**
2. Email：`969117727@qq.com`
3. Password：设置强密码（20 位以上随机），**只私下告诉家人**
4. 勾选 **Auto Confirm User**（免邮箱验证）

然后关闭自助注册：

1. **Authentication** → **Providers** → **Email**
2. 关闭 **Enable sign ups**（禁止陌生人注册）

## 数据库初始化

按顺序执行 migration（或 `npm run db:migrate` 一次跑完全部）：

```bash
cd web
SUPABASE_DB_PASSWORD='你的数据库密码' npm run db:migrate
```

Migration 文件：

1. `20260626100000_initial.sql` — 表结构 + 初始 RLS
2. `20260626110000_add_units.sql` — 计量单位
3. `20260626200000_auth_rls.sql` — **Auth 安全**：撤销 anon 权限，仅 authenticated 可读写

若已跑过前两个，只需在 SQL Editor 执行第三个，或重新 `db:migrate`（脚本按文件名顺序执行，重复 policy 有 IF NOT EXISTS 保护）。

## 访问模式

- **登录**：家人打开 App → 输入家庭密码 → session 持久化（PWA 亦适用）
- **数据共享**：全 household 共用一份数据（无 `user_id`）
- **RLS**：`anon` 无任何表权限；`authenticated` 可读写
- **Publishable key** 会打进前端 JS，但无 JWT 无法访问数据

## 安全说明

- 不要把家庭密码写进代码、`.env` 或 GitHub Secrets
- `service_role` key 与数据库密码仅用于运维，切勿放入前端
- 建议在 Dashboard **轮换 publishable key** 后更新 GitHub Secrets 并重新部署
- 可选：Authentication → **Rate limits** 开启登录限速，防暴力猜密码
