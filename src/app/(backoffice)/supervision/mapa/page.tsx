'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Navigation, User, MapPin, Clock, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '1.5rem'
};

const center = { lat: -12.0464, lng: -77.0428 }; // Lima, Peru

export default function SupervisionMapaPage() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedVendId, setSelectedVendId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch real sellers
    const { data: vendedores, isLoading: loadingVends } = useQuery({
        queryKey: ['vendedores-gps'],
        queryFn: async () => {
            const { data: users, error } = await supabase
                .from('usuarios')
                .select('id, nombres, apellidos, rol, codigo_vendedor')
                .eq('rol', 'vendedor')
                .eq('activo', true);

            if (error) throw error;

            // Fetch latest tracking for each
            const { data: tracking } = await supabase
                .from('tracking_gps')
                .select('*')
                .order('hora', { ascending: false });

            // Fetch visits of today
            const { data: visits } = await supabase
                .from('visitas_gps')
                .select('*, clientes(razon_social, latitud, longitud)')
                .eq('fecha', new Date().toISOString().split('T')[0]);

            // If demo mode (few/no sellers with pos), add mock ones
            let finalSellers = users.map(u => {
                const lastTrack = tracking?.find(t => t.usuario_id === u.id);
                const userVisits = visits?.filter(v => v.vendedor_id === u.id) || [];
                const mockRoute = userVisits.length > 0
                    ? userVisits.map(v => ({ lat: Number(v.clientes?.latitud), lng: Number(v.clientes?.longitud) }))
                    : generateMockRoute(lastTrack?.latitud || center.lat, lastTrack?.longitud || center.lng);

                return {
                    id: u.id,
                    nombre: `${u.nombres} ${u.apellidos}`,
                    codigo: u.codigo_vendedor,
                    pos: lastTrack ? { lat: Number(lastTrack.latitud), lng: Number(lastTrack.longitud) } : { lat: center.lat + (Math.random() - 0.5) * 0.05, lng: center.lng + (Math.random() - 0.5) * 0.05 },
                    lastPing: lastTrack ? new Date(lastTrack.hora).toLocaleTimeString() : new Date().toLocaleTimeString(),
                    activo: true, // Always active for demo
                    distrito: 'Lima',
                    ruta: mockRoute
                };
            });

            return finalSellers;
        },
        refetchInterval: 30000 // Refresh every 30s
    });

    const filteredVends = vendedores?.filter(v => v.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const selectedVend = vendedores?.find(v => v.id === selectedVendId);

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
                    <div className="flex -space-x-2">
                        {vendedores?.slice(0, 3).map((v, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                                {v.nombre[0]}
                            </div>
                        ))}
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-black px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-ping" />
                        {vendedores?.filter(v => v.activo).length} EN LÍNEA
                    </Badge>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Sidebar */}
                <Card className="w-96 shrink-0 flex flex-col overflow-hidden border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4 border-b bg-gray-50/30">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Buscar vendedor o placa..."
                                className="h-10 text-sm pl-10 bg-white border-none shadow-inner rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                        {loadingVends ? (
                            <div className="p-12 text-center text-gray-400 font-medium italic">Sincronizando con satélites...</div>
                        ) : filteredVends?.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">No se encontraron unidades.</div>
                        ) : filteredVends?.map(v => (
                            <div key={v.id}
                                onClick={() => {
                                    setSelectedVendId(v.id);
                                    if (v.pos) {
                                        map?.panTo(v.pos);
                                        map?.setZoom(16);
                                    }
                                }}
                                className={`p-4 hover:bg-blue-50/50 cursor-pointer transition-all group relative ${selectedVendId === v.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${v.activo ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                            {v.nombre[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-[13px] text-gray-800 uppercase tracking-tight">{v.nombre}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{v.codigo || 'S/C'}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`text-[9px] font-black uppercase ${v.activo ? 'border-green-200 bg-green-50 text-green-600' : 'text-gray-300'}`}>
                                        {v.activo ? 'Online' : 'Offline'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between ml-1">
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                                        <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {v.lastPing}</div>
                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500" /> {v.distrito}</div>
                                    </div>
                                    <Navigation className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Map Area */}
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border-8 border-white relative overflow-hidden ring-1 ring-black/5">
                    {!isLoaded ? (
                        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-blue-600 font-black uppercase tracking-widest text-xs">Cargando Cartografía Digital</p>
                        </div>
                    ) : (
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
                                styles: mapStyles // High-end map dark/light mix
                            }}
                        >
                            {vendedores?.map(v => v.pos && (
                                <React.Fragment key={v.id}>
                                    <Marker
                                        position={v.pos}
                                        onClick={() => setSelectedVendId(v.id)}
                                        icon={{
                                            path: google.maps.SymbolPath.CIRCLE,
                                            fillColor: v.id === selectedVendId ? '#2563EB' : v.activo ? '#3B82F6' : '#94A3B8',
                                            fillOpacity: 1,
                                            strokeColor: '#FFFFFF',
                                            strokeWeight: 4,
                                            scale: v.id === selectedVendId ? 10 : 8,
                                        }}
                                    />
                                    {v.ruta.length > 0 && (selectedVendId === v.id || !selectedVendId) && (
                                        <Polyline
                                            path={v.ruta}
                                            options={{
                                                strokeColor: v.activo ? '#3B82F6' : '#94A3B8',
                                                strokeOpacity: 0.6,
                                                strokeWeight: 4,
                                                icons: [{
                                                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, fillOpacity: 1, scale: 2 },
                                                    offset: '100%',
                                                    repeat: '100px'
                                                }]
                                            }}
                                        />
                                    )}
                                    {selectedVendId === v.id && (
                                        <InfoWindow position={v.pos} onCloseClick={() => setSelectedVendId(null)}>
                                            <div className="p-3 max-w-xs bg-white rounded-xl">
                                                <div className="flex items-center gap-3 mb-2 border-b pb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                                                        {v.nombre[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-900 leading-tight uppercase tracking-tighter">{v.nombre}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">{v.codigo}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Carga:</span> <span className="font-black text-blue-600">82%</span></p>
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Estado:</span> <span className={`${v.activo ? 'text-green-600' : 'text-gray-400'} font-black uppercase`}>{v.activo ? 'En Ruta' : 'Pausado'}</span></p>
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Velocidad:</span> <span className="font-mono">14 km/h</span></p>
                                                </div>
                                                <Button size="sm" className="w-full mt-3 h-8 bg-slate-900 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                    Ver Ruta Completa
                                                </Button>
                                            </div>
                                        </InfoWindow>
                                    )}
                                </React.Fragment>
                            ))}
                        </GoogleMap>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helpers for Demo/Professionalism
function generateMockRoute(lat: number, lng: number) {
    const route = [];
    for (let i = 0; i < 5; i++) {
        route.push({
            lat: lat + (Math.random() - 0.5) * 0.02,
            lng: lng + (Math.random() - 0.5) * 0.02
        });
    }
    return route;
}

const mapStyles = [
    { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
    { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] },
    { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }] },
    { "featureType": "road.highway", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
    { "featureType": "road.arterial", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#d2e5f9" }, { "visibility": "on" }] }
];
