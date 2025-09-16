import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Wonder — CEO LLM Chooser",
  description: "Compare engines and chat with Azure GPT-5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
