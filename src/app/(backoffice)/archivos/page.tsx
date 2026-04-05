'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    FolderOpen, Plus, Upload, Grid3X3, List, Search, Filter,
    File, FileText, FileSpreadsheet, FileImage, Film, Archive,
    Lock, Eye, Download, MoreHorizontal, Trash2, Share2, Shield,
    ChevronRight, HardDrive, Clock, Star, RefreshCcw, AlertCircle,
    CheckCircle2, XCircle, Loader2, Link, Copy, FolderPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';

// ─── Menú Personalizado (reemplaza DropdownMenu de Base UI para evitar Error #31) ─
function FileMenu({ onDownload, onShare, onDelete }: {
    onDownload: () => void;
    onShare: () => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-slate-400 focus:outline-none"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div className="absolute right-0 bottom-full mb-1 z-50 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in-0 zoom-in-95 duration-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2 py-1">Opciones</p>
                    <button onClick={() => { setOpen(false); onDownload(); }} className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-xl hover:bg-slate-50 transition-colors">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Descargar</span>
                    </button>
                    <button onClick={() => { setOpen(false); onShare(); }} className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-xl hover:bg-slate-50 transition-colors">
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Compartir</span>
                    </button>
                    <div className="my-1 h-px bg-slate-100" />
                    <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-xl hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-black text-red-600">Eliminar</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Proyecto = {
    id: string;
    nombre: string;
    descripcion: string | null;
    icono: string;
    color: string;
    acceso: string;
    created_at: string;
    _count?: number;
};

type Archivo = {
    id: string;
    proyecto_id: string;
    nombre_original: string;
    tipo_mime: string | null;
    extension: string | null;
    tamano_original: number;
    tamano_almacenado: number;
    storage_path: string;
    tiene_clave: boolean;
    descripcion: string | null;
    tags: string[] | null;
    total_vistas: number;
    total_descargas: number;
    activo: boolean;
    created_at: string;
    subido_por: string | null;
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (ext: string | null, mime: string | null) => {
    const e = (ext || '').toLowerCase();
    const m = (mime || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(e) || m.startsWith('image/'))
        return { icon: FileImage, color: '#F6C519' };
    if (['pdf'].includes(e) || m === 'application/pdf')
        return { icon: FileText, color: '#E74C3C' };
    if (['xlsx', 'xls', 'csv'].includes(e) || m.includes('spreadsheet') || m.includes('excel'))
        return { icon: FileSpreadsheet, color: '#27AE60' };
    if (['docx', 'doc'].includes(e) || m.includes('word'))
        return { icon: FileText, color: '#2980B9' };
    if (['mp4', 'mov', 'avi', 'mkv'].includes(e) || m.startsWith('video/'))
        return { icon: Film, color: '#9B59B6' };
    if (['zip', 'rar', '7z', 'gz'].includes(e) || m.includes('zip'))
        return { icon: Archive, color: '#E67E22' };
    return { icon: File, color: '#95A5A6' };
};



const getTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    return date.toLocaleDateString('es-PE');
};

// ─── Subida Pipeline ──────────────────────────────────────────────────────────
type UploadProgress = {
    name: string;
    status: 'pending' | 'processing' | 'uploading' | 'done' | 'error';
    original: number;
    stored?: number;
    error?: string;
};

async function processAndUploadFile(
    file: File,
    proyectoId: string,
    onProgress: (update: Partial<UploadProgress>) => void
): Promise<void> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const tamanoOriginal = file.size;

    onProgress({ status: 'processing' });

    // LEER ARCHIVO COMO ARRAYBUFFER (EVITAR CONSUMIR MÚLTIPLES VECES)
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[Archivos] Procesando "${file.name}":`, { size: file.size, type: file.type });

    // Hash SHA-256 para deduplicación
    let hash = '';
    try {
        const buf = await crypto.subtle.digest('SHA-256', arrayBuffer);
        hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { console.error('[Archivos] Error hashing:', e); }


    // Verificar duplicado
    if (hash) {
        const { data: dup } = await supabase
            .from('archivos')
            .select('id, nombre_original')
            .eq('hash_sha256', hash)
            .eq('proyecto_id', proyectoId)
            .eq('activo', true)
            .single();
        if (dup) {
            onProgress({ status: 'error', error: `Duplicado: "${dup.nombre_original}"` });
            return;
        }
    }

    // Subir a Storage
    onProgress({ status: 'uploading' });
    const storagePath = `${proyectoId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('archivos-corporativos')
        .upload(storagePath, arrayBuffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
        });


    if (uploadError) {
        onProgress({ status: 'error', error: uploadError.message });
        return;
    }

    // Registrar en BD
    const { error: dbError } = await supabase.from('archivos').insert({
        proyecto_id: proyectoId,
        nombre_original: file.name,
        nombre_storage: file.name,
        tipo_mime: file.type,
        extension: ext,
        tamano_original: tamanoOriginal,
        tamano_almacenado: arrayBuffer.byteLength,
        hash_sha256: hash || null,
        storage_path: storagePath,
    });


    if (dbError) {
        onProgress({ status: 'error', error: dbError.message });
        return;
    }

    onProgress({ status: 'done', stored: arrayBuffer.byteLength });
    console.log(`[Archivos] Subida exitosa: "${file.name}"`, { path: storagePath });

}

// ─── Componentes Internos ─────────────────────────────────────────────────────

function ProyectoItem({ proyecto, isActive, onClick }: { proyecto: Proyecto; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all group hover:scale-[1.01] ${isActive
                ? 'bg-[#1A2C45] text-white shadow-lg shadow-[#1A2C45]/20'
                : 'hover:bg-slate-100 text-slate-700'
                }`}
        >
            <span className="text-xl flex-shrink-0">{proyecto.icono}</span>
            <div className="flex-1 min-w-0">
                <p className={`font-black text-xs uppercase tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {proyecto.nombre}
                </p>
                {proyecto._count !== undefined && (
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                        {proyecto._count} archivos
                    </p>
                )}
            </div>
            {proyecto._count !== undefined && proyecto._count > 0 && (
                <Badge className={`text-[9px] font-black px-2 py-1 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {proyecto._count}
                </Badge>
            )}
        </button>
    );
}

function FileCard({ archivo, onMenu }: { archivo: Archivo; onMenu: (action: 'download' | 'share' | 'delete') => void }) {
    const { icon: Icon, color } = getFileIcon(archivo.extension, archivo.tipo_mime);

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#1A2C45]/20 transition-all group flex flex-col overflow-hidden hover:-translate-y-1">
            {/* Preview Area */}
            <div
                className="h-32 flex items-center justify-center cursor-pointer relative overflow-hidden"
                style={{ background: `${color}15` }}
                onClick={() => onMenu('download')}
            >
                <Icon className="w-12 h-12 opacity-70" style={{ color }} />
                {archivo.tiene_clave && (
                    <div className="absolute top-2 right-2 bg-slate-800/80 backdrop-blur-sm text-white p-1.5 rounded-lg">
                        <Lock className="w-3 h-3" />
                    </div>
                )}
                <div className="absolute inset-0 bg-[#1A2C45]/0 group-hover:bg-[#1A2C45]/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-1.5 text-xs font-black uppercase text-[#1A2C45] tracking-tight flex items-center gap-2">
                        <Download className="w-3 h-3" /> Descargar
                    </div>
                </div>
            </div>

            {/* Info Area */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="font-black text-xs text-slate-800 truncate leading-tight" title={archivo.nombre_original}>
                    {archivo.nombre_original}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {formatBytes(archivo.tamano_original)}
                    </span>

                    <span className="text-[10px] text-slate-300 uppercase font-bold">
                        {(archivo.extension || '?').toUpperCase()}
                    </span>
                </div>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                    {getTimeAgo(archivo.created_at)}
                </p>
                <div className="flex items-center gap-3 mt-auto pt-1">
                    <span className="flex items-center gap-1 text-[9px] text-slate-300 font-bold">
                        <Eye className="w-3 h-3" /> {archivo.total_vistas}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-slate-300 font-bold">
                        <Download className="w-3 h-3" /> {archivo.total_descargas}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
                <Button
                    size="sm"
                    onClick={() => onMenu('download')}
                    className="flex-1 h-8 rounded-xl bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white text-[10px] font-black uppercase tracking-tight"
                >
                    <Download className="w-3 h-3 mr-1.5" /> Descargar
                </Button>
                <FileMenu
                    onDownload={() => onMenu('download')}
                    onShare={() => onMenu('share')}
                    onDelete={() => onMenu('delete')}
                />
            </div>
        </div>
    );
}

// ─── Modal Nuevo Proyecto ─────────────────────────────────────────────────────
const ICONOS = ['📁', '📊', '📋', '📸', '🎨', '📄', '💼', '📦', '🔒', '📌', '🗂️', '📃', '📈', '🗃️', '🎯', '⭐'];
const COLORES = ['#1A2C45', '#27AE60', '#F6C519', '#E74C3C', '#2980B9', '#8B5CF6', '#E67E22', '#16A085'];

function NuevoProyectoModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [icono, setIcono] = useState('📁');
    const [color, setColor] = useState('#1A2C45');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        setLoading(true);
        const { error } = await supabase.from('archivo_proyectos').insert({
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            icono,
            color,
            acceso: 'equipo'
        });
        setLoading(false);
        if (error) { toast.error('Error al crear el proyecto'); return; }
        toast.success('Proyecto creado');
        setNombre(''); setDescripcion(''); setIcono('📁'); setColor('#1A2C45');
        onCreated();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg rounded-[2rem] border-0 shadow-2xl p-8">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Nuevo Proyecto</DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">Crea una carpeta para organizar tus archivos corporativos</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nombre del Proyecto *</label>
                        <Input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="ej. Contratos Clientes 2026"
                            className="h-12 rounded-2xl border-2 border-slate-100 focus:border-[#1A2C45] text-sm font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            placeholder="Descripción opcional..."
                            className="w-full h-20 rounded-2xl border-2 border-slate-100 focus:border-[#1A2C45] p-3 text-sm font-medium resize-none outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Ícono</label>
                        <div className="grid grid-cols-8 gap-2">
                            {ICONOS.map(i => (
                                <button
                                    key={i}
                                    onClick={() => setIcono(i)}
                                    className={`text-xl h-10 w-10 rounded-xl transition-all hover:scale-110 ${icono === i ? 'bg-[#1A2C45]/10 ring-2 ring-[#1A2C45] scale-110' : 'bg-slate-50 hover:bg-slate-100'}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Color</label>
                        <div className="flex gap-3 flex-wrap">
                            {COLORES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-9 h-9 rounded-xl transition-all hover:scale-110 border-4 ${color === c ? 'scale-110 border-white shadow-lg' : 'border-transparent'}`}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl border-2 font-bold">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="flex-1 h-12 rounded-2xl bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white font-black uppercase tracking-tight"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Crear Proyecto
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Upload Modal (Drag & Drop) ───────────────────────────────────────────────
function UploadModal({
    open, onClose, proyectoId, onUploaded
}: { open: boolean; onClose: () => void; proyectoId: string; onUploaded: () => void }) {
    const [files, setFiles] = useState<UploadProgress[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (fileList: FileList) => {
        const newFiles = Array.from(fileList).map<UploadProgress>(f => ({
            name: f.name,
            status: 'pending',
            original: f.size,
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const startUpload = async (selectedFiles: FileList) => {
        setUploading(true);
        const fileArray = Array.from(selectedFiles);

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));

            await processAndUploadFile(file, proyectoId, (update) => {
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, ...update } : f));
            });
        }
        setUploading(false);
        onUploaded();
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
            startUpload(e.dataTransfer.files);
        }
    };

    const totalOriginal = files.reduce((acc, f) => acc + f.original, 0);
    const totalStored = files.filter(f => f.stored).reduce((acc, f) => acc + (f.stored || 0), 0);
    const doneCount = files.filter(f => f.status === 'done').length;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl rounded-[2rem] border-0 shadow-2xl p-8">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Upload className="w-6 h-6 text-[#1A2C45]" />
                        Subir Archivos
                    </DialogTitle>
                </DialogHeader>

                <div
                    className={`mt-6 border-3 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${isDragging ? 'border-[#1A2C45] bg-[#1A2C45]/5 scale-105' : 'border-slate-200 hover:border-[#1A2C45]/50 hover:bg-slate-50'
                        }`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="font-black text-slate-700 text-lg tracking-tight">Arrastra archivos aquí</p>
                    <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar</p>
                    <p className="text-[10px] text-slate-300 mt-3 uppercase font-bold tracking-widest">
                        PDF · DOCX · XLSX · JPG · PNG · MP4 · ZIP · máx. 50 MB
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFiles(e.target.files);
                                startUpload(e.target.files);
                                e.target.value = '';
                            }
                        }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.mp4,.zip"
                    />
                </div>

                {files.length > 0 && (
                    <div className="mt-6 space-y-3 max-h-64 overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                {doneCount}/{files.length} completados
                            </p>
                            {totalStored > 0 && (
                                <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {formatBytes(totalOriginal)}
                                </p>
                            )}
                        </div>
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                                <div className="flex-shrink-0">
                                    {f.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    {f.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                                    {(f.status === 'processing' || f.status === 'uploading') && <Loader2 className="w-5 h-5 text-[#1A2C45] animate-spin" />}
                                    {f.status === 'pending' && <Clock className="w-5 h-5 text-slate-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-700 truncate">{f.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                                        {f.status === 'pending' && `${formatBytes(f.original)} · Esperando`}
                                        {(f.status === 'processing' || f.status === 'uploading') && 'Subiendo archivo...'}
                                        {f.status === 'done' && `${formatBytes(f.original)} · Completado`}
                                        {f.status === 'error' && (f.error || 'Error')}
                                    </p>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => { setFiles([]); onClose(); }}
                        className="flex-1 h-12 rounded-2xl border-2 font-bold"
                        disabled={uploading}
                    >
                        {uploading ? 'Subiendo...' : 'Cerrar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArchivosPage() {
    const queryClient = useQueryClient();
    const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [showNuevoProyecto, setShowNuevoProyecto] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    // Fetch proyectos
    const { data: proyectos, isLoading: loadingProyectos } = useQuery({
        queryKey: ['archivo-proyectos'],
        queryFn: async () => {
            const { data: projs, error } = await supabase
                .from('archivo_proyectos')
                .select('*')
                .order('nombre');
            if (error) throw error;

            // Count archivos per project
            const counts = await Promise.all(
                (projs || []).map(async p => {
                    const { count } = await supabase
                        .from('archivos')
                        .select('id', { count: 'exact', head: true })
                        .eq('proyecto_id', p.id)
                        .eq('activo', true);
                    return { id: p.id, count: count || 0 };
                })
            );

            return (projs || []).map(p => ({
                ...p,
                _count: counts.find(c => c.id === p.id)?.count || 0
            })) as Proyecto[];
        }
    });

    // Fetch archivos of selected project
    const { data: archivos, isLoading: loadingArchivos } = useQuery({
        queryKey: ['archivos-proyecto', selectedProyecto?.id],
        enabled: !!selectedProyecto,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('archivos')
                .select('*')
                .eq('proyecto_id', selectedProyecto!.id)
                .eq('activo', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Archivo[];
        }
    });

    // Storage stats
    const { data: stats } = useQuery({
        queryKey: ['archivos-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.from('archivos').select('tamano_almacenado').eq('activo', true);
            if (error) return { total: 0 };
            const total = data?.reduce((acc, f) => acc + (f.tamano_almacenado || 0), 0) || 0;
            return { total };
        }
    });

    const filteredArchivos = archivos?.filter(a =>
        a.nombre_original.toLowerCase().includes(search.toLowerCase()) ||
        (a.descripcion || '').toLowerCase().includes(search.toLowerCase())
    );

    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['archivo-proyectos'] });
        queryClient.invalidateQueries({ queryKey: ['archivos-proyecto', selectedProyecto?.id] });
        queryClient.invalidateQueries({ queryKey: ['archivos-stats'] });
    };

    const handleFileMenu = async (archivo: Archivo, action: 'view' | 'download' | 'share' | 'delete') => {
        if (action === 'download') {
            try {
                const { data, error } = await supabase.storage
                    .from('archivos-corporativos')
                    .createSignedUrl(archivo.storage_path, 60, {
                        download: archivo.nombre_original
                    });
                if (error) throw error;

                const link = document.createElement('a');
                link.href = data.signedUrl;
                link.download = archivo.nombre_original;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Register download
                await supabase.from('archivos').update({
                    total_descargas: archivo.total_descargas + 1
                }).eq('id', archivo.id);
                refreshAll();
            } catch (e: any) {
                toast.error('Error al descargar: ' + e.message);
            }
        } else if (action === 'share') {
            try {
                // Check for existing link or create new one
                const { data: existing } = await supabase
                    .from('archivo_links')
                    .select('token')
                    .eq('archivo_id', archivo.id)
                    .eq('activo', true)
                    .gt('expira_en', new Date().toISOString())
                    .maybeSingle();


                let token = existing?.token;
                if (!token) {
                    token = crypto.randomUUID();
                    await supabase.from('archivo_links').insert({
                        archivo_id: archivo.id,
                        token,
                        tipo: 'solo_ver',
                        expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                        creado_por: (await supabase.auth.getUser()).data.user?.id
                    });

                }

                const url = `${window.location.origin}/ver/${token}`;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado al portapapeles (Válido 7 días)');
            } catch (e: any) {
                toast.error('Error al generar link: ' + e.message);
            }
        } else if (action === 'delete') {
            if (!confirm(`¿Eliminar "${archivo.nombre_original}"? Se enviará a la papelera.`)) return;
            await supabase.from('archivos').update({ activo: false }).eq('id', archivo.id);
            refreshAll();
            toast.success('Archivo eliminado (papelera 30 días)');
        }
    };

    const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB
    const usedPc = stats ? (stats.total / STORAGE_LIMIT) * 100 : 0;

    return (
        <div className="flex h-full -m-4 md:-m-6 lg:-m-8 overflow-hidden" style={{ background: '#F5F6F8' }}>

            {/* ─── Columna Izquierda ───────────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-full shadow-xl shadow-slate-100/50">
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-[#1A2C45]" />
                            <h1 className="font-black text-sm uppercase text-[#1A2C45] tracking-widest">Mis Archivos</h1>
                        </div>
                        <button
                            onClick={() => setShowNuevoProyecto(true)}
                            className="w-8 h-8 bg-[#1A2C45] text-white rounded-xl flex items-center justify-center hover:bg-[#1A2C45]/80 transition-all hover:scale-110 shadow-lg shadow-[#1A2C45]/20"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Proyectos List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {loadingProyectos ? (
                        <div className="flex flex-col gap-2 mt-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : proyectos?.length === 0 ? (
                        <div className="text-center py-12 text-slate-300">
                            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-xs font-black uppercase tracking-widest">Sin proyectos</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowNuevoProyecto(true)}
                                className="mt-4 rounded-xl font-bold text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Crear primero
                            </Button>
                        </div>
                    ) : (
                        proyectos?.map(p => (
                            <ProyectoItem
                                key={p.id}
                                proyecto={p}
                                isActive={selectedProyecto?.id === p.id}
                                onClick={() => setSelectedProyecto(p)}
                            />
                        ))
                    )}
                </div>

                {/* Storage Stats Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Almacenamiento</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-500">
                            {formatBytes(stats?.total || 0)} / 5 GB
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#1A2C45] to-[#F6C519] rounded-full transition-all"
                            style={{ width: `${Math.min(usedPc, 100)}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">{usedPc.toFixed(1)}% utilizado</p>
                </div>
            </div>

            {/* ─── Columna Derecha ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedProyecto ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-sm">
                            <div className="w-28 h-28 bg-[#1A2C45]/5 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-dashed border-[#1A2C45]/20">
                                <FolderOpen className="w-12 h-12 text-[#1A2C45]/30" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selecciona un proyecto</h2>
                                <p className="text-slate-400 text-sm mt-2">Elige una carpeta del panel izquierdo para ver y gestionar sus archivos</p>
                            </div>
                            <Button
                                onClick={() => setShowNuevoProyecto(true)}
                                className="bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-tight shadow-xl shadow-[#1A2C45]/20"
                            >
                                <FolderPlus className="w-4 h-4 mr-2" /> Crear Proyecto
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header del Proyecto */}
                        <div className="bg-white border-b border-slate-100 px-8 py-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{selectedProyecto.icono}</span>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedProyecto.nombre}</h2>
                                        {selectedProyecto.descripcion && (
                                            <p className="text-sm text-slate-400 mt-0.5">{selectedProyecto.descripcion}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <Input
                                            placeholder="Buscar archivos..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="h-10 pl-10 pr-4 rounded-2xl border-2 border-slate-100 focus:border-[#1A2C45] w-64 text-sm font-medium"
                                        />
                                    </div>
                                    {/* Vista toggle */}
                                    <div className="flex bg-slate-100 rounded-2xl p-1">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1A2C45]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1A2C45]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <Button
                                        onClick={() => setShowUpload(true)}
                                        className="bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white rounded-2xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#1A2C45]/20 hover:scale-105 transition-all"
                                    >
                                        <Upload className="w-4 h-4 mr-2" /> Subir Archivo
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {loadingArchivos ? (
                                <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-52 bg-white rounded-3xl animate-pulse border border-slate-100" />
                                    ))}
                                </div>
                            ) : !filteredArchivos || filteredArchivos.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                            <File className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest">
                                            {search ? 'No se encontraron archivos' : 'Sin archivos en este proyecto'}
                                        </p>
                                        {!search && (
                                            <Button
                                                onClick={() => setShowUpload(true)}
                                                variant="outline"
                                                className="rounded-2xl font-bold border-2 hover:border-[#1A2C45] hover:text-[#1A2C45]"
                                            >
                                                <Upload className="w-4 h-4 mr-2" /> Subir primer archivo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {filteredArchivos.map(archivo => (
                                        <FileCard
                                            key={archivo.id}
                                            archivo={archivo}
                                            onMenu={action => handleFileMenu(archivo, action as any)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                // Vista lista
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest py-4 pl-6">Nombre</th>
                                                <th className="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest py-4">Tipo</th>
                                                <th className="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest py-4">Tamaño</th>
                                                <th className="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest py-4">Fecha</th>
                                                <th className="text-center text-[10px] font-black uppercase text-slate-400 tracking-widest py-4">Vistas</th>
                                                <th className="w-24"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredArchivos.map(archivo => {
                                                const { icon: Icon, color } = getFileIcon(archivo.extension, archivo.tipo_mime);

                                                return (
                                                    <tr
                                                        key={archivo.id}
                                                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                        onClick={() => handleFileMenu(archivo, 'download')}
                                                    >
                                                        <td className="py-4 pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                                                                    <Icon className="w-5 h-5" style={{ color }} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-sm text-slate-800 truncate max-w-[200px]">{archivo.nombre_original}</p>
                                                                    {archivo.tiene_clave && <Lock className="w-3 h-3 text-slate-300 inline ml-1" />}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase px-2 rounded-lg">
                                                                {(archivo.extension || '?').toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-sm font-bold text-slate-500">{formatBytes(archivo.tamano_original)}</td>

                                                        <td className="text-[11px] font-bold text-slate-400">{getTimeAgo(archivo.created_at)}</td>
                                                        <td className="text-center">
                                                            <span className="text-sm font-black text-slate-300 flex items-center justify-center gap-1">
                                                                <Eye className="w-3 h-3" /> {archivo.total_vistas}
                                                            </span>
                                                        </td>
                                                        <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                                                            <FileMenu
                                                                onDownload={() => handleFileMenu(archivo, 'download')}
                                                                onShare={() => handleFileMenu(archivo, 'share')}
                                                                onDelete={() => handleFileMenu(archivo, 'delete')}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ─── Modals ──────────────────────────────────────────────────── */}
            <NuevoProyectoModal
                open={showNuevoProyecto}
                onClose={() => setShowNuevoProyecto(false)}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['archivo-proyectos'] })}
            />

            {selectedProyecto && (
                <UploadModal
                    open={showUpload}
                    onClose={() => setShowUpload(false)}
                    proyectoId={selectedProyecto.id}
                    onUploaded={refreshAll}
                />
            )}


        </div>
    );
}
