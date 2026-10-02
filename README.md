# Vexo پیام‌رسان

پیام‌رسان خصوصی تیم — شبیه تلگرام، روی سرور خودتان.

## قابلیت‌ها
- ثبت‌نام فقط با آیدی + رمز (بدون شماره)
- چت لحظه‌ای (WebSocket)
- ارسال متن، عکس، فیلم و فایل
- ذخیره دائمی در دیتابیس و دیسک سرور
- پروفایل و عکس پروفایل

## اجرا روی همین سیستم

```bash
npm run setup
npm run dev
```

سپس باز کنید: http://localhost:5173

## اجرا روی سرور (پروداکشن)

```bash
npm run setup
npm run build --prefix client
npm start --prefix server
```

## دیپلوی آنلاین (Render)

کد روی GitHub است؛ برای لینک همیشگی موبایل روی [Render](https://render.com) دیپلوی کن:

https://render.com/deploy?repo=https://github.com/samanyasin1389-svg/vexo-messenger

بعد از دیپلوی، لینک `https://vexo-messenger.onrender.com` را روی گوشی باز کن.

