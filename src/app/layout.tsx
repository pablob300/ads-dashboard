import type { Metadata } from "next";
import { Roboto, Sora } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

// Ambas são variable fonts: um arquivo cobre toda a faixa de peso, então
// font-bold/semibold continuam funcionando sem download extra.
// Roboto = corpo de texto; Sora = headlines (ver globals.css).
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

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
    <html lang="pt-BR" className={`h-full ${roboto.variable} ${sora.variable}`}>
      <body className="h-full bg-slate-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
