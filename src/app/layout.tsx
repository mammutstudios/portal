import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mammut Portal",
  description: "Mammut Studios client portal",
  // Geen icons-blok: dat wees allebei naar dezelfde png van 510 pixels en
  // overschreef daarmee icon.svg en apple-icon.png, die er juist voor bedoeld
  // zijn. Next pakt die bestanden nu vanzelf, elk op zijn eigen maat.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
