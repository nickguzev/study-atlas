import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Atlas — бакалавриат за рубежом",
  description: "67 университетов Европы, США и ОАЭ для бакалавриата по экономике/финансам/бизнесу — бюджет, шанс поступления, карьерные перспективы и окупаемость обучения.",
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
