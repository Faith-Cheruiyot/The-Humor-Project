import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Humor Project | Caption Club",
  description: "Share photos with AI-written captions, browse the community meme feed, and vote for the punchlines that land.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
