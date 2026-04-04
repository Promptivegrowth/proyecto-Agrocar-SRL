'use client';

import { use } from 'react';
import { login } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Snowflake, Lock, Mail, ChevronRight, Loader2 } from 'lucide-react'
import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = use(searchParams);
    const [isLoading, setIsLoading] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const result = await login(formData) as { error?: string, success?: boolean };
            if (result?.error) {
                setIsLoading(false);
                toast.error(result.error);
                return;
            }
            toast.success("¡Bienvenido al sistema Agrocar!", {
                description: "Sincronizando sesión segura..."
            });
            // Show premium transition overlay
            setShowOverlay(true);
            setTimeout(() => {
                window.location.href = '/';
            }, 1800);
        } catch (error) {
            setIsLoading(false);
            // Next.js redirect throws an error, we ignore it if it's a redirect
            if ((error as any).digest?.includes('NEXT_REDIRECT')) return;
            toast.error("Error al iniciar sesión");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans">
            {/* Background Decorations - Cold Storage Aesthetic */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="text-center mb-10">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30 transform transition-transform hover:scale-105 active:scale-95 cursor-pointer border border-blue-400/20">
                        <Snowflake className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Agrocar <span className="text-blue-500">SRL</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="h-[1px] w-8 bg-slate-700" />
                        <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Línea de Frío</p>
                        <div className="h-[1px] w-8 bg-slate-700" />
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl p-1 rounded-[2.5rem] shadow-2xl border border-white/5">
                    <div className="bg-slate-900/60 rounded-[2.25rem] p-8 border border-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Ingreso ERP</h2>
                                <p className="text-slate-500 text-sm mt-1">Control Total Operativo</p>
                            </div>
                            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 text-blue-400 font-mono">v2.4.0</Badge>
                        </div>

                        <form action={handleSubmit} className="space-y-6">
                            {params?.error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    {params.error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 ml-1 text-xs font-bold uppercase tracking-wider">Correo Electrónico</Label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="usuario@agrocar.com.pe"
                                        required
                                        className="w-full bg-slate-950/40 border-slate-800 text-white pl-12 h-[3.25rem] rounded-2xl focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-slate-300 text-xs font-bold uppercase tracking-wider">Contraseña</Label>
                                    <button type="button" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-tighter">Recuperar acceso</button>
                                </div>
                                <div className="relative group/input">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-slate-950/40 border-slate-800 text-white pl-12 h-[3.25rem] rounded-2xl focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-[0.2em] h-14 rounded-2xl shadow-[0_8px_20px_-6px_rgba(37,99,235,0.35)] hover:shadow-[0_12px_25px_-4px_rgba(37,99,235,0.45)] transition-all duration-300 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Iniciando...
                                    </>
                                ) : (
                                    <>
                                        Iniciar Sesión
                                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.25em]">
                        &copy; {new Date().getFullYear()} Agrocar SRL • Industrial ERP
                    </p>
                </div>
            </div>

            {/* Premium Success Overlay */}
            {showOverlay && (
                <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="relative">
                        <div className="w-32 h-32 bg-blue-600/20 rounded-full animate-ping absolute inset-0" />
                        <div className="w-32 h-32 bg-blue-600 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl shadow-blue-500/50 border border-blue-400/30">
                            <Snowflake className="w-16 h-16 text-white animate-spin-slow" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white mt-10 tracking-widest uppercase italic">Autenticación Exitosa</h2>
                    <p className="text-blue-400 font-bold text-xs mt-2 uppercase tracking-[0.3em] animate-pulse">Sincronizando con el servidor...</p>

                    <div className="mt-12 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 animate-progress-fast" />
                    </div>
                </div>
            )}
        </div>
    )
}
