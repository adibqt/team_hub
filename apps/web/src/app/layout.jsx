import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Team Hub — Where teams ship together",
  description: "Collaborative goals, real-time updates, and audit-ready history for modern teams.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
            success: { iconTheme: { primary: "#a78bfa", secondary: "#1e293b" } },
          }}
        />
      </body>
    </html>
  );
}
