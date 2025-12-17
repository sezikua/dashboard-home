import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import ParticleBackground from "@/components/particle-background"
import { ServiceWorkerRegistrar } from "@/components/sw-register"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Софіївська Борщагівка — дашборд",
  description: "Сучасний дашборд з погодою та тривогами для Софіївської Борщагівки",
  generator: "Next.js",
  themeColor: "#020617",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uk">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#020617" />
        {/* iOS web app support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Софіївська Борщагівка" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Явний favicon.ico для всіх браузерів */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body className="font-sans antialiased relative">
        <ParticleBackground />
        <ServiceWorkerRegistrar />
        <div className="relative z-10">{children}</div>
        <Analytics />
      </body>
    </html>
  )
}
