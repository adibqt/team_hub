import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";
import ThemeProvider from "@/components/ThemeProvider";

export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata = {
  title: "Team Hub — Where teams ship together",
  description: "Collaborative goals, real-time updates, and audit-ready history for modern teams.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans antialiased bg-paper text-ink">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "2px",
              background: "rgb(var(--color-ink))",
              color: "rgb(var(--color-paper))",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.01em",
            },
            success: {
              iconTheme: {
                primary: "rgb(var(--color-ember))",
                secondary: "rgb(var(--color-ink))",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
