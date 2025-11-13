// app/layout.jsx
import "./globals.css";
import { Permanent_Marker } from "next/font/google";

const handdrawn = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handdrawn",
});

export const metadata = {
  title: "Drawdle",
  description: "AI drawing guessing game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={handdrawn.variable}>
      <body className="font-handdrawn bg-[#1f1f1f] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
