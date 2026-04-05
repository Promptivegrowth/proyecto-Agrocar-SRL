'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, Lock, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type LinkData = {
    id: string;
    token: string;
    tipo: 'solo_ver' | 'descargar';
    clave_requerida: boolean;
    max_vistas: number | null;
    vistas_actuales: number;
    expira_en: string | null;
    activo: boolean;
    archivos: {
        id: string;
        nombre_original: string;
        storage_path: string;
        extension: string | null;
        tipo_mime: string | null;
        tamano_original: number;
    } | null;
};

export default function VerArchivoPublicoPage({ params }: { params: { token: string } }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkData, setLinkData] = useState<LinkData | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [clave, setClave] = useState('');
    const [needsClave, setNeedsClave] = useState(false);
    const [claveError, setClaveError] = useState(false);

    const loadLink = async () => {
        setLoading(true);
        const { data: link, error: linkError } = await supabase
            .from('archivo_links')
            .select('*, archivos(id, nombre_original, storage_path, extension, tipo_mime, tamano_original)')
            .eq('token', params.token)
            .eq('activo', true)
            .single();

        if (linkError || !link) { setError('Link no válido o ha expirado.'); setLoading(false); return; }
        if (link.expira_en && new Date(link.expira_en) < new Date()) {
            await supabase.from('archivo_links').update({ activo: false }).eq('id', link.id);
            setError('Este link ha expirado.'); setLoading(false); return;
        }
        if (link.max_vistas && link.vistas_actuales >= link.max_vistas) {
            setError('Este link ha alcanzado el límite de vistas.'); setLoading(false); return;
        }

        setLinkData(link as LinkData);
        if (link.clave_requerida) {
            setNeedsClave(true); setLoading(false); return;
        }
        await serveFile(link as LinkData);
    };

    const serveFile = async (link: LinkData) => {
        if (!link.archivos) { setError('Archivo no encontrado.'); setLoading(false); return; }

        const { data: signed } = await supabase.storage
            .from('archivos-corporativos')
            .createSignedUrl(link.archivos.storage_path, 600);

        if (!signed?.signedUrl) { setError('No se pudo generar el acceso al archivo.'); setLoading(false); return; }

        await supabase.from('archivo_links')
            .update({ vistas_actuales: link.vistas_actuales + 1 })
            .eq('id', link.id);

        if (link.tipo === 'descargar') {
            window.location.href = signed.signedUrl;
            setLoading(false); return;
        }
        setSignedUrl(signed.signedUrl);
        setLoading(false);
    };

    const handleClave = async () => {
        if (!linkData || !clave) return;
        const { data: archivo } = await supabase.from('archivos').select('clave_hash, tiene_clave').eq('id', linkData.archivos!.id).single();
        if (!archivo?.tiene_clave) { await serveFile(linkData); return; }

        // Hash clave con SHA-256 en cliente
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clave));
        const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== archivo.clave_hash) { setClaveError(true); return; }
        setNeedsClave(false);
        await serveFile(linkData);
    };

    useEffect(() => { loadLink(); }, [params.token]);

    const archivo = linkData?.archivos;
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(archivo?.extension || '');
    const isPDF = archivo?.extension === 'pdf';

    return (
        <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
            {/* Header público */}
            <div className="bg-[#1A2C45] py-4 px-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F6C519] rounded-xl flex items-center justify-center">
                        <span className="text-[#1A2C45] font-black text-xs">A</span>
                    </div>
                    <span className="text-white font-black text-sm tracking-tight">AGROCAR SRL</span>
                </div>
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-white/40" />
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Visor Seguro</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8">
                {loading && (
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-[#1A2C45] mx-auto" />
                        <p className="font-black uppercase text-slate-400 text-sm tracking-widest">Verificando acceso...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-white rounded-3xl p-10 shadow-xl text-center max-w-md">
                        <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Acceso no disponible</h2>
                        <p className="text-slate-400 text-sm">{error}</p>
                    </div>
                )}

                {needsClave && linkData && (
                    <div className="bg-white rounded-3xl p-10 shadow-xl max-w-sm w-full">
                        <div className="w-14 h-14 bg-[#1A2C45]/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-7 h-7 text-[#1A2C45]" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 text-center mb-1">Archivo protegido</h2>
                        <p className="text-slate-400 text-sm text-center mb-6 truncate">{linkData.archivos?.nombre_original}</p>
                        <Input
                            type="password"
                            placeholder="Clave de acceso"
                            value={clave}
                            onChange={e => { setClave(e.target.value); setClaveError(false); }}
                            className={`h-12 rounded-2xl border-2 ${claveError ? 'border-red-300 bg-red-50' : 'border-slate-100'} mb-2`}
                            onKeyDown={e => e.key === 'Enter' && handleClave()}
                        />
                        {claveError && <p className="text-xs text-red-500 font-bold mb-3 text-center">Clave incorrecta</p>}
                        <Button
                            onClick={handleClave}
                            className="w-full h-12 bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white rounded-2xl font-black uppercase tracking-tight"
                        >
                            <Lock className="w-4 h-4 mr-2" /> Desbloquear
                        </Button>
                    </div>
                )}

                {signedUrl && !loading && !error && (
                    <div className="w-full max-w-5xl h-[75vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#1A2C45]" />
                            <div>
                                <p className="font-black text-sm text-slate-900">{archivo?.nombre_original}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    Solo visualización · No se permite descargar
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 relative overflow-hidden" onContextMenu={e => e.preventDefault()}>
                            {isImage && (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 p-8 overflow-auto relative">
                                    <img
                                        src={signedUrl}
                                        alt={archivo?.nombre_original}
                                        className="max-w-full max-h-full object-contain rounded-2xl"
                                        draggable={false}
                                        style={{ userSelect: 'none' } as any}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-white/5 font-black text-5xl uppercase tracking-widest rotate-[-30deg] select-none">
                                            AGROCAR SRL
                                        </p>
                                    </div>
                                </div>
                            )}
                            {isPDF && (
                                <iframe
                                    src={`${signedUrl}#toolbar=0&navpanes=0`}
                                    className="w-full h-full border-0"
                                    title={archivo?.nombre_original}
                                    sandbox="allow-same-origin allow-scripts"
                                />
                            )}
                            {!isImage && !isPDF && (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <div className="text-center">
                                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p className="font-black text-sm uppercase tracking-widest">Vista previa no disponible para este tipo de archivo</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="py-4 px-8 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                Compartido por AGROCAR S.R.L. · Este documento es confidencial
            </div>
        </div>
    );
}
