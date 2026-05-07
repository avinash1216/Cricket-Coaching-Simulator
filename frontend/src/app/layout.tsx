import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthContext";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "🏏 Cricket Coaching Simulator",
  description: "Be the virtual coach! Make tactical decisions during live IPL matches and compete on the leaderboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
