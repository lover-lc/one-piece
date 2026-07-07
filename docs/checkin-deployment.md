# 打卡模块部署清单

## 本地（开发）

```bash
cd web
npx supabase start          # 需 Docker，首次较慢
npx supabase db reset       # 应用全部迁移（含 checkin_*）

# 手动触发结算（本地）

方式 A — 临时启动函数（无需 JWT）：

```bash
npx supabase functions serve checkin-daily-settlement --no-verify-jwt
# 另开终端：
curl -X POST http://127.0.0.1:54321/functions/v1/checkin-daily-settlement
```

方式 B — 使用 service_role（若 Kong 仍要求 Authorization）：

```bash
# 从 npx supabase status 复制 Secret key
curl -X POST http://127.0.0.1:54321/functions/v1/checkin-daily-settlement \
  -H "Authorization: Bearer <Secret key from supabase status>" \
  -H "apikey: <Secret key>"
```

# 查看结果
npx supabase db query "SELECT * FROM checkin_daily_snapshots ORDER BY snapshot_date DESC LIMIT 5;"
npx supabase db query "SELECT * FROM checkin_daily_duels ORDER BY snapshot_date DESC LIMIT 5;"
```

本地 **不会** 自动跑 cron，需手动 curl 或等生产环境定时任务。

---

## 生产（需你本人在 Dashboard / CLI 完成）

### 1. 登录并关联项目

```bash
cd web
npx supabase login
npx supabase link --project-ref liedowqqnzrklygdaqkw
```

### 2. 推送数据库迁移

```bash
npx supabase db push
```

### 3. 部署 Edge Function

```bash
npx supabase functions deploy checkin-daily-settlement
```

函数 URL：

```
https://liedowqqnzrklygdaqkw.supabase.co/functions/v1/checkin-daily-settlement
```

`config.toml` 已设置 `verify_jwt = false`（仅内部结算调用；生产 cron 仍建议用 Dashboard 调度）。

### 4. 配置 Cron（Dashboard）

1. [Supabase Dashboard](https://supabase.com/dashboard) → 项目 `liedowqqnzrklygdaqkw`
2. **Edge Functions** → `checkin-daily-settlement` → **Schedules**
3. 新建：**Cron** `0 16 * * *`，时区 **UTC**，方法 **POST**

（`0 16 * * *` UTC = 上海 00:00）

### 5. 手动验证

```bash
curl -X POST \
  'https://liedowqqnzrklygdaqkw.supabase.co/functions/v1/checkin-daily-settlement' \
  -H "Content-Type: application/json"
```

成功示例：`{"snapshotDate":"...","usersProcessed":1,"usersSkipped":0,"errors":0}`

### 6. 排查

```sql
SELECT * FROM checkin_settlement_logs ORDER BY created_at DESC LIMIT 10;
```

常见 `usersSkipped`：家庭成员不是恰好 2 人，或尚无 `checkin_member_profiles`。
