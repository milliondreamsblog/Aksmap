import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/shared/Sidebar";

export const metadata: Metadata = {
  title: "Job Hunter",
  description: "Personal job search dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
