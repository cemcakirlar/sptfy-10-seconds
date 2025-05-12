# Şarkı Tahmin Oyunu 🎵

YouTube canlı yayınları için geliştirilmiş 10 saniyelik şarkı tahmin oyunu. Spotify API kullanarak rastgele şarkılar çalar ve kullanıcıların tahmin etmesini sağlar.

## Özellikler

- Rastgele şarkı seçimi
- 9 saniyelik şarkı önizlemesi
- Bulanık albüm kapağı
- Şarkıcı ve şarkı adı gizleme
- Tahmin kontrolü
- Modern ve responsive arayüz

## Kurulum

1. Repoyu klonlayın:

```bash
git clone [repo-url]
cd sptfy
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. Spotify Developer Dashboard'dan bir uygulama oluşturun ve credentials'ları alın:

   - https://developer.spotify.com/dashboard adresine gidin
   - Yeni bir uygulama oluşturun
   - Client ID ve Client Secret'ı kopyalayın

4. `.env` dosyası oluşturun ve credentials'ları ekleyin:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=https://127.0.0.1:3000 # Or your deployment URL
```

5. Uygulamayı başlatın:

```bash
npm run dev
```

6. Tarayıcınızda https://127.0.0.1:3000 adresine gidin

## Teknolojiler

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Spotify Web API

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [https://127.0.0.1:3000](https://127.0.0.1:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
