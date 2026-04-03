import { LogOut } from 'lucide-react';

export default function PwaLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 h-full max-w-lg mx-auto sm:border-x shadow-xl">
            <header className="bg-primary text-primary-foreground sticky top-0 z-50 px-4 py-3 shadow flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">AGROCAR Vendedor</span>
                    <span className="text-xs text-primary-foreground/70">Sesión iniciada</span>
                </div>
                <button className="p-2 -mr-2 text-primary-foreground/80 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>
            <main className="flex-1 overflow-y-auto pb-safe flex flex-col relative w-full">
                {children}
            </main>
        </div>
    );
}
