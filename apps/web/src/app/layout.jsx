import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata = { title: "Team Hub", description: "Collaborative Team Hub" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
