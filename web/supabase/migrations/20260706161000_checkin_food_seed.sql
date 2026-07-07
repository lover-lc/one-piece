-- Full system food library seed (~50 items). Idempotent on (name, user_id IS NULL).
-- Data mirrors web/src/modules/checkin/lib/food-library-seed.ts

INSERT INTO public.checkin_food_library (
  user_id, name, kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g
)
SELECT v.user_id, v.name, v.kcal_per_100g, v.protein_g_per_100g, v.fat_g_per_100g, v.carbs_g_per_100g
FROM (
  VALUES
    (NULL::uuid, '白米饭', 116::numeric, 2.6::numeric, 0.3::numeric, 25.9::numeric),
    (NULL::uuid, '馒头', 223::numeric, 7.0::numeric, 1.1::numeric, 47.0::numeric),
    (NULL::uuid, '水煮蛋', 144::numeric, 13.3::numeric, 8.8::numeric, 1.1::numeric),
    (NULL::uuid, '鸡胸肉', 133::numeric, 19.4::numeric, 5.0::numeric, 2.5::numeric),
    (NULL::uuid, '西兰花', 34::numeric, 2.8::numeric, 0.4::numeric, 6.6::numeric),
    (NULL::uuid, '苹果', 52::numeric, 0.3::numeric, 0.2::numeric, 13.8::numeric),
    (NULL::uuid, '牛奶', 54::numeric, 3.0::numeric, 3.2::numeric, 4.8::numeric),
    (NULL::uuid, '油条', 386::numeric, 8.0::numeric, 22.0::numeric, 42.0::numeric),
    (NULL::uuid, '红烧肉', 395::numeric, 12.0::numeric, 35.0::numeric, 4.0::numeric),
    (NULL::uuid, '番茄炒蛋', 120::numeric, 6.5::numeric, 8.0::numeric, 5.5::numeric),
    (NULL::uuid, '面条(煮)', 138::numeric, 4.5::numeric, 0.5::numeric, 28.0::numeric),
    (NULL::uuid, '花卷', 211::numeric, 6.4::numeric, 1.0::numeric, 45.6::numeric),
    (NULL::uuid, '小米粥', 46::numeric, 1.4::numeric, 0.7::numeric, 9.0::numeric),
    (NULL::uuid, '玉米', 106::numeric, 4.0::numeric, 1.2::numeric, 22.8::numeric),
    (NULL::uuid, '红薯', 86::numeric, 1.6::numeric, 0.1::numeric, 20.1::numeric),
    (NULL::uuid, '紫薯', 82::numeric, 1.5::numeric, 0.2::numeric, 19.5::numeric),
    (NULL::uuid, '土豆', 77::numeric, 2.0::numeric, 0.1::numeric, 17.5::numeric),
    (NULL::uuid, '豆腐', 81::numeric, 8.1::numeric, 3.7::numeric, 4.2::numeric),
    (NULL::uuid, '豆浆', 31::numeric, 3.0::numeric, 1.6::numeric, 1.8::numeric),
    (NULL::uuid, '酸奶', 72::numeric, 2.5::numeric, 2.7::numeric, 9.3::numeric),
    (NULL::uuid, '煎蛋', 196::numeric, 13.6::numeric, 15.0::numeric, 1.2::numeric),
    (NULL::uuid, '虾仁', 93::numeric, 18.6::numeric, 1.2::numeric, 0.5::numeric),
    (NULL::uuid, '牛肉(瘦)', 106::numeric, 20.2::numeric, 2.3::numeric, 0.0::numeric),
    (NULL::uuid, '猪里脊', 143::numeric, 20.3::numeric, 6.2::numeric, 1.5::numeric),
    (NULL::uuid, '鲫鱼', 108::numeric, 17.1::numeric, 2.7::numeric, 3.8::numeric),
    (NULL::uuid, '三文鱼', 208::numeric, 20.0::numeric, 13.0::numeric, 0.0::numeric),
    (NULL::uuid, '黄瓜', 16::numeric, 0.7::numeric, 0.1::numeric, 3.6::numeric),
    (NULL::uuid, '生菜', 15::numeric, 1.4::numeric, 0.2::numeric, 2.9::numeric),
    (NULL::uuid, '菠菜', 28::numeric, 2.6::numeric, 0.3::numeric, 4.5::numeric),
    (NULL::uuid, '胡萝卜', 39::numeric, 0.9::numeric, 0.2::numeric, 9.6::numeric),
    (NULL::uuid, '西红柿', 18::numeric, 0.9::numeric, 0.2::numeric, 3.9::numeric),
    (NULL::uuid, '大白菜', 17::numeric, 1.5::numeric, 0.1::numeric, 3.2::numeric),
    (NULL::uuid, '青椒', 22::numeric, 1.0::numeric, 0.2::numeric, 5.4::numeric),
    (NULL::uuid, '豆角', 30::numeric, 2.5::numeric, 0.2::numeric, 6.0::numeric),
    (NULL::uuid, '茄子', 25::numeric, 1.1::numeric, 0.2::numeric, 5.9::numeric),
    (NULL::uuid, '冬瓜', 12::numeric, 0.4::numeric, 0.1::numeric, 2.6::numeric),
    (NULL::uuid, '香蕉', 89::numeric, 1.1::numeric, 0.2::numeric, 22.8::numeric),
    (NULL::uuid, '橙子', 47::numeric, 0.8::numeric, 0.2::numeric, 11.8::numeric),
    (NULL::uuid, '草莓', 32::numeric, 0.7::numeric, 0.3::numeric, 7.7::numeric),
    (NULL::uuid, '西瓜', 30::numeric, 0.6::numeric, 0.2::numeric, 7.6::numeric),
    (NULL::uuid, '宫保鸡丁', 195::numeric, 14.0::numeric, 10.5::numeric, 10.0::numeric),
    (NULL::uuid, '麻婆豆腐', 125::numeric, 8.0::numeric, 7.5::numeric, 5.0::numeric),
    (NULL::uuid, '清炒时蔬', 45::numeric, 2.0::numeric, 2.5::numeric, 4.0::numeric),
    (NULL::uuid, '蛋炒饭', 188::numeric, 6.5::numeric, 7.0::numeric, 25.0::numeric),
    (NULL::uuid, '水饺', 220::numeric, 7.5::numeric, 8.0::numeric, 30.0::numeric),
    (NULL::uuid, '肉包', 227::numeric, 9.0::numeric, 8.5::numeric, 30.0::numeric),
    (NULL::uuid, '馄饨', 150::numeric, 6.0::numeric, 4.5::numeric, 20.0::numeric),
    (NULL::uuid, '扬州炒饭', 190::numeric, 7.0::numeric, 7.5::numeric, 24.0::numeric),
    (NULL::uuid, '炸鸡腿', 250::numeric, 18.0::numeric, 15.0::numeric, 8.0::numeric),
    (NULL::uuid, '薯条', 312::numeric, 3.4::numeric, 15.0::numeric, 41.0::numeric)
) AS v (user_id, name, kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checkin_food_library f
  WHERE f.user_id IS NULL AND f.name = v.name
);
