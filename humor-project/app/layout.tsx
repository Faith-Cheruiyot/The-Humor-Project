import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Humor Project | Caption Club",
  description: "Turn photos into AI-captioned memes, keep your own meme gallery, and vote for the community’s favorite captions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
