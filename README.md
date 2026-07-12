# Result Portal

কলেজ রেজাল্ট প্রকাশনা ওয়েবসাইট (Next.js + Supabase)

## ধাপ ১: Environment Variables সেট করা

`.env.local.example` ফাইলটার নাম বদলে `.env.local` করো, তারপর নিচের তথ্যগুলো বসাও:

```
SUPABASE_URL=https://sggawreafobexiitvzhk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=তোমার_secret_key
SESSION_SECRET=একটা_র‍্যান্ডম_শক্ত_স্ট্রিং
ADMIN_USERNAME=তোমার_পছন্দমতো_admin_username
ADMIN_PASSWORD=তোমার_পছন্দমতো_admin_password
```

`SESSION_SECRET` বানানোর জন্য টার্মিনালে চালাও:
```
openssl rand -base64 32
```

## ধাপ ২: লোকালি রান করা (নিজের কম্পিউটারে টেস্ট করতে)

```
npm install
npm run dev
```

তারপর ব্রাউজারে যাও: http://localhost:3000

## ধাপ ৩: Vercel-এ ডিপ্লয় করা

1. এই কোডটা GitHub-এ একটা নতুন রিপোজিটরিতে পুশ/আপলোড করো
2. Vercel ড্যাশবোর্ডে "Add New Project" → GitHub রিপো সিলেক্ট করো
3. Environment Variables সেকশনে উপরের ৫টা ভ্যারিয়েবল একই নামে বসাও
4. Deploy বাটনে ক্লিক করো

## এখন পর্যন্ত যা তৈরি হয়েছে

- হোমপেজ (৩টা লগইন অপশনের লিংক)
- Student লগইন (Roll + Section + PIN)
- Teacher লগইন (Index Number + Password)
- Admin লগইন (Username + Password, .env থেকে)
- সেশন সিস্টেম (৮ ঘণ্টা মেয়াদী, এনক্রিপ্টেড কুকি)
- তিনটা বেসিক ড্যাশবোর্ড (এখনো খালি, পরের ধাপে ফিচার যোগ হবে)

## পরের ধাপে যা বাকি আছে

- Teacher/Student/Subject অ্যাড করার UI (এডমিন প্যানেলে)
- PIN/Password hash করে ডেটাবেসে বসানোর script
- রেজাল্ট আপলোড/আপডেট ফর্ম (শিক্ষক ড্যাশবোর্ডে)
- রেজাল্ট দেখা (ছাত্র ড্যাশবোর্ডে)
- রেজাল্ট পাবলিশ অ্যাপ্রুভাল সিস্টেম (এডমিন)
