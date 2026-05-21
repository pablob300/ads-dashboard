import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "B300 Dashboard",
  description: "Dashboard para gerenciamento de campanhas Google Ads e Meta Ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-slate-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
