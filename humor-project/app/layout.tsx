import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Humor Project | Caption Club",
  description: "Turn campus and city scenes into Gemini-written captions, then vote for the community favorites.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
