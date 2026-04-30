import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

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
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased bg-paper text-ink">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "2px",
              background: "#0F0F12",
              color: "#F5F1E8",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.01em",
            },
            success: { iconTheme: { primary: "#D34F1F", secondary: "#0F0F12" } },
          }}
        />
      </body>
    </html>
  );
}
