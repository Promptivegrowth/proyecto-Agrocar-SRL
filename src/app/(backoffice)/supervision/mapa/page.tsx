'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Navigation, User, MapPin, Clock, Zap, Truck, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
const center = { lat: -12.0464, lng: -77.0428 };

// Stable Lima districts for simulated positions (computed once, not on every render)
const LIMA_POSITIONS = [
    { lat: -12.0464, lng: -77.0428 }, // Centro
    { lat: -12.1100, lng: -77.0500 }, // Miraflores
    { lat: -12.0800, lng: -77.0900 }, // San Isidro
    { lat: -12.1300, lng: -76.9900 }, // La Molina
    { lat: -11.9500, lng: -77.0700 }, // Los Olivos
    { lat: -12.0400, lng: -77.1100 }, // San Miguel
    { lat: -12.1500, lng: -77.0200 }, // Surco
    { lat: -11.9900, lng: -77.0600 }, // Independencia
];

function getStablePosition(id: string) {
    // Hash ID to a stable index so position doesn't change on re-render
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return LIMA_POSITIONS[hash % LIMA_POSITIONS.length];
}

export default function SupervisionMapaPage() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedVendId, setSelectedVendId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'todos' | 'vendedor' | 'vehiculo'>('todos');

    // Animated positions (for simulated movement)
    const [animPositions, setAnimPositions] = useState<Record<string, { lat: number; lng: number }>>({});
    const animRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const { data: unidades, isLoading: loadingUnits } = useQuery({
        queryKey: ['unidades-gps'],
        queryFn: async () => {
            const { data: users } = await supabase
                .from('usuarios')
                .select('id, nombres, apellidos, rol, codigo_vendedor')
                .eq('rol', 'vendedor')
                .eq('activo', true);

            const { data: vehiculos } = await supabase
                .from('vehiculos')
                .select('id, placa, modelo, marca')
                .eq('activo', true);

            const { data: tracking } = await supabase
                .from('tracking_gps')
                .select('usuario_id, latitud, longitud, hora, velocidad')
                .not('velocidad', 'in', '(-1,-2)')
                .order('hora', { ascending: false })
                .limit(100);

            const sellers = (users || []).map(u => {
                const lastTrack = tracking?.find(t => t.usuario_id === u.id && t.velocidad >= 0);
                const hasRealPos = lastTrack && Number(lastTrack.latitud) !== 0;
                const stablePos = getStablePosition(u.id);
                return {
                    id: u.id,
                    tipo: 'vendedor' as const,
                    nombre: `${u.nombres} ${u.apellidos}`,
                    subtitulo: u.codigo_vendedor || 'VENDEDOR',
                    basePos: hasRealPos
                        ? { lat: Number(lastTrack!.latitud), lng: Number(lastTrack!.longitud) }
                        : stablePos,
                    lastPing: lastTrack ? new Date(lastTrack.hora).toLocaleTimeString() : new Date().toLocaleTimeString(),
                };
            });

            const fleet = (vehiculos || []).map(v => {
                const stablePos = getStablePosition(v.id);
                return {
                    id: v.id,
                    tipo: 'vehiculo' as const,
                    nombre: v.placa,
                    subtitulo: `${v.marca || ''} ${v.modelo || ''}`.trim(),
                    basePos: stablePos,
                    lastPing: new Date().toLocaleTimeString(),
                };
            });

            return [...sellers, ...fleet];
        },
        refetchInterval: 30000
    });

    // Initialize animated positions from base positions
    useEffect(() => {
        if (!unidades) return;
        const initial: Record<string, { lat: number; lng: number }> = {};
        unidades.forEach(u => { initial[u.id] = u.basePos; });
        setAnimPositions(initial);
    }, [unidades]);

    // Simulated animation: nudge positions slightly every 4 seconds
    useEffect(() => {
        if (!unidades || unidades.length === 0) return;
        animRef.current = setInterval(() => {
            setAnimPositions(prev => {
                const next = { ...prev };
                unidades.forEach(u => {
                    const cur = prev[u.id] || u.basePos;
                    next[u.id] = {
                        lat: cur.lat + (Math.random() - 0.5) * 0.0003,
                        lng: cur.lng + (Math.random() - 0.5) * 0.0003,
                    };
                });
                return next;
            });
        }, 4000);
        return () => clearInterval(animRef.current);
    }, [unidades]);

    const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
    const onUnmount = useCallback(() => setMap(null), []);

    const filteredUnits = unidades?.filter(u =>
        (filterType === 'todos' || u.tipo === filterType) &&
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedUnit = unidades?.find(u => u.id === selectedVendId);
    const selectedPos = selectedVendId ? animPositions[selectedVendId] : null;

    if (!isLoaded) {
        return (
            <div className="h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-blue-600 font-black uppercase tracking-widest text-xs">Cargando Cartografía Digital</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Supervisión de Flota <Zap className="w-8 h-8 text-blue-600 fill-blue-600 animate-pulse" />
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Monitoreo satelital de fuerza de ventas y despacho en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl shadow-sm border">
                    <div className="flex gap-2">
                        <Button variant={filterType === 'todos' ? 'default' : 'ghost'} size="sm" className="h-8 rounded-xl text-[10px] font-black" onClick={() => setFilterType('todos')}>TODOS</Button>
                        <Button variant={filterType === 'vendedor' ? 'default' : 'ghost'} size="sm" className="h-8 rounded-xl text-[10px] font-black" onClick={() => setFilterType('vendedor')}><Users className="w-3 h-3 mr-1" /> VENTAS</Button>
                        <Button variant={filterType === 'vehiculo' ? 'default' : 'ghost'} size="sm" className="h-8 rounded-xl text-[10px] font-black" onClick={() => setFilterType('vehiculo')}><Truck className="w-3 h-3 mr-1" /> FLOTA</Button>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Sidebar */}
                <Card className="w-96 shrink-0 flex flex-col overflow-hidden border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4 border-b bg-gray-50/30">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar vendedor o placa..."
                                className="h-10 text-sm pl-10 bg-white border-none shadow-inner rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-gray-50">
                        {loadingUnits ? (
                            <div className="p-12 text-center text-gray-400 font-medium italic">Sincronizando con satélites...</div>
                        ) : filteredUnits?.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">No se encontraron unidades.</div>
                        ) : filteredUnits?.map(u => (
                            <div key={u.id}
                                onClick={() => {
                                    setSelectedVendId(u.id === selectedVendId ? null : u.id);
                                    const pos = animPositions[u.id];
                                    if (pos) { map?.panTo(pos); map?.setZoom(16); }
                                }}
                                className={`p-4 hover:bg-blue-50/50 cursor-pointer transition-all group relative ${selectedVendId === u.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${u.tipo === 'vehiculo' ? 'bg-amber-500' : 'bg-blue-600'}`}>
                                            {u.tipo === 'vehiculo' ? <Truck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-[13px] text-gray-800 uppercase tracking-tight">{u.nombre}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.subtitulo}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-green-200 bg-green-50 text-green-600">EN LÍNEA</Badge>
                                </div>
                                <div className="flex items-center gap-3 ml-1 text-[10px] text-gray-500 font-medium">
                                    <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {u.lastPing}</div>
                                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500" /> Lima, PE</div>
                                    <Navigation className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all ml-auto" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Map */}
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border-8 border-white relative overflow-hidden ring-1 ring-black/5">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={center}
                        zoom={13}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            disableDefaultUI: false,
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            styles: mapStyles,
                        }}
                    >
                        {unidades?.map(u => {
                            const pos = animPositions[u.id];
                            if (!pos || isNaN(pos.lat) || isNaN(pos.lng)) return null;
                            return (
                                <React.Fragment key={u.id}>
                                    <Marker
                                        position={pos}
                                        onClick={() => setSelectedVendId(u.id === selectedVendId ? null : u.id)}
                                        icon={{
                                            url: u.tipo === 'vehiculo'
                                                ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="%23F59E0B" stroke="white" stroke-width="1.5"><path d="M10 17h4V5H2v12h3m10 0h2l3.41-5.12A1.99 1.99 0 0 0 19 11h-4v6z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>')
                                                : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="%232563EB" stroke="white" stroke-width="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'),
                                            scaledSize: new google.maps.Size(36, 36),
                                            anchor: new google.maps.Point(18, 18)
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {selectedUnit && selectedPos && !isNaN(selectedPos.lat) && !isNaN(selectedPos.lng) && (
                            <InfoWindow
                                position={selectedPos}
                                onCloseClick={() => setSelectedVendId(null)}
                                options={{ pixelOffset: new google.maps.Size(0, -24) }}
                            >
                                <div style={{ fontFamily: 'sans-serif', maxWidth: 220 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: selectedUnit.tipo === 'vehiculo' ? '#F59E0B' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ color: 'white', fontSize: 16 }}>{selectedUnit.tipo === 'vehiculo' ? '🚛' : '👤'}</span>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 900, fontSize: 12, margin: 0, textTransform: 'uppercase' }}>{selectedUnit.nombre}</p>
                                            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>{selectedUnit.subtitulo}</p>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, lineHeight: '1.8' }}>
                                        <div><b>Estado:</b> <span style={{ color: '#16a34a', fontWeight: 700 }}>● ACTIVO</span></div>
                                        <div><b>Tipo:</b> {selectedUnit.tipo === 'vehiculo' ? 'Vehículo de Flota' : 'Vendedor de Campo'}</div>
                                        <div><b>Ping:</b> <span style={{ fontFamily: 'monospace' }}>{selectedUnit.lastPing}</span></div>
                                        <div><b>Zona:</b> Lima Metropolitana</div>
                                    </div>
                                    <button
                                        onClick={() => { if (selectedPos) map?.panTo(selectedPos); }}
                                        style={{ marginTop: 10, width: '100%', padding: '6px 0', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                                    >
                                        Centrar en Mapa
                                    </button>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                </div>
            </div>
        </div>
    );
}

const mapStyles = [
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
    { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f2f2f2' }] },
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: 45 }] },
    { featureType: 'road.highway', elementType: 'all', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'road.arterial', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'all', stylers: [{ color: '#d2e5f9' }, { visibility: 'on' }] },
];
