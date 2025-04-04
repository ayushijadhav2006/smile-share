import "./globals.css";
import { Toaster } from "react-hot-toast";
import FloatingNavbar from "@/components/floating-navbar";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/footer";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import WebProvider from "@/providers/WebProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { GamificationProvider } from "@/context/GamificationContext";
import "leaflet/dist/leaflet.css";
// import { ThirdwebProvider } from "@thirdweb-dev/react";

export const metadata = {
  title: "SMILE-SHARE",
  description:
    "SMILE-SHARE is a platform for NGOs to manage their activities and events.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn("min-h-screen bg-white font-sans antialiased")}>
        <WebProvider>
          <LanguageProvider>
            <AuthProvider>
              <GamificationProvider>
                <div className="relative flex min-h-screen flex-col">
                  <main className="flex-1">{children}</main>
                </div>
              </GamificationProvider>
            </AuthProvider>
          </LanguageProvider>
        </WebProvider>
        <Toaster />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
