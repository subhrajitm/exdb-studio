# Exdata Studio

A modern Next.js application for transforming Excel files into databases, AI insights, and presentations.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
exdbstudio/
├── app/
│   ├── layout.tsx      # Root layout with metadata and fonts
│   ├── page.tsx         # Main page component
│   └── globals.css      # Global styles and animations
├── components/
│   ├── Header.tsx       # Navigation header
│   ├── Hero.tsx        # Hero section with interactive animations
│   ├── Features.tsx    # Features section
│   ├── TabsSection.tsx # Tabbed content section
│   ├── CTA.tsx         # Call-to-action section
│   └── Footer.tsx      # Footer component
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hooks** for interactive features
- **Responsive Design** for all screen sizes
- **Interactive Animations** with mouse effects and data visualizations

## Build for Production

```bash
npm run build
npm start
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

