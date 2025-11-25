import type { Metadata } from "next";
import "./globals.css";
import { EmojiClientProvider } from "@/components/EmojiClientProvider";

export const metadata: Metadata = {
  title: "aadivya — dms to self",
  description: "a personal site skinned as an instagram dm thread about what i am building and thinking about",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <EmojiClientProvider>
          {children}
        </EmojiClientProvider>
      </body>
    </html>
  );
}
