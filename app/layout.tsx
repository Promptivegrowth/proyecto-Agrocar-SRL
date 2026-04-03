import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toast"; // Ensure shadcn toaster is added eventually

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Agrocar SRL - ERP Linea de Frio",
    description: "Distribución de embutidos y productos refrigerados",
    manifest: "/manifest.json"
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <Providers>
                    {children}
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
