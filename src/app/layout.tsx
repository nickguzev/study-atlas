import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Atlas — бакалавриат за рубежом",
  description: "67 университетов Европы и США для бакалавриата по экономике/финансам/бизнесу.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
