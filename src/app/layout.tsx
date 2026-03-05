import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { dbConnect } from "@/lib/mongo";
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "next auth demo",
  description: "next auth demo",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await dbConnect();
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <Navbar/>
          <main className="p-2">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

