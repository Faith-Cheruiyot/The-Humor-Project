import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "Something delightfully funny is on its way.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
