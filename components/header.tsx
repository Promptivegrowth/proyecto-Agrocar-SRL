'use client';
import { UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="font-semibold text-gray-800">
                Panel de Control - AGROCAR SRL
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Gerencia</span>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500">
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
        </header>
    );
}
