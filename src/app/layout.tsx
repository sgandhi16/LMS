import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/shared/navbar";
import { CommandPalette } from "@/components/shared/command-palette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "APEX LMS — Elite Sports Training & Assessment Academy",
  description:
    "Master boxing, football, tennis, and more with structured video modules, sequential unlocking, and instant verified test scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white`}>
        <Providers>
          <Navbar />
          <CommandPalette />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
