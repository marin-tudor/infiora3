import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Loader from "@/components/common/Loader";
import { Suspense } from "react";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import "@/env";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Infiora",
  description: "Infiora - ",
  openGraph: {
    title: "Infiora",
    description: "Infiora - ",
    images: [
      {
        url: "https://app.infiora.hr/logo.png",
        width: 800,
        height: 600,
        alt: "Logo Alt Text",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <Suspense fallback={<Loader center />}>{children}</Suspense>
        <ToastContainer />
      </body>
    </html>
  );
}
