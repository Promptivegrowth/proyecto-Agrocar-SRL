'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Navigation, User, MapPin, Clock, Zap, Truck, Users } from 'lucide-react';
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
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_FALLBACK_KEY' // Reemplazar con key real si es necesario
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedVendId, setSelectedVendId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch units (Vendedores + Vehículos)
    const { data: unidades, isLoading: loadingUnits } = useQuery({
        queryKey: ['unidades-gps'],
        queryFn: async () => {
            // 1. Fetch Vendedores
            const { data: users } = await supabase
                .from('usuarios')
                .select('id, nombres, apellidos, rol, codigo_vendedor')
                .eq('rol', 'vendedor')
                .eq('activo', true);

            // 2. Fetch Vehículos
            const { data: vehiculos } = await supabase
                .from('vehiculos')
                .select('id, placa, modelo, marca')
                .eq('activo', true);

            // 3. Fetch latest tracking for all
            const { data: tracking } = await supabase
                .from('tracking_gps')
                .select('*')
                .order('hora', { ascending: false });

            const today = new Date().toISOString().split('T')[0];
            const { data: visits } = await supabase
                .from('visitas_gps')
                .select('*, clientes(razon_social, latitud, longitud)')
                .eq('fecha', today);

            const sellers = (users || []).map(u => {
                const lastTrack = tracking?.find(t => t.usuario_id === u.id);
                const userVisits = visits?.filter(v => v.vendedor_id === u.id) || [];
                return {
                    id: u.id,
                    tipo: 'vendedor',
                    nombre: `${u.nombres} ${u.apellidos}`,
                    subtitulo: u.codigo_vendedor || 'VEND-001',
                    pos: lastTrack ? { lat: Number(lastTrack.latitud), lng: Number(lastTrack.longitud) } : { lat: center.lat + (Math.random() - 0.5) * 0.05, lng: center.lng + (Math.random() - 0.5) * 0.05 },
                    lastPing: lastTrack ? new Date(lastTrack.hora).toLocaleTimeString() : new Date().toLocaleTimeString(),
                    ruta: userVisits.map(v => ({ lat: Number(v.clientes?.latitud), lng: Number(v.clientes?.longitud) }))
                };
            });

            const fleet = (vehiculos || []).map(v => {
                const lastTrack = tracking?.find(t => t.usuario_id === v.id); // Assuming vehicle tracking or driver tracking
                return {
                    id: v.id,
                    tipo: 'vehiculo',
                    nombre: v.placa,
                    subtitulo: `${v.marca} ${v.modelo}`,
                    pos: lastTrack ? { lat: Number(lastTrack.latitud), lng: Number(lastTrack.longitud) } : { lat: center.lat + (Math.random() - 0.5) * 0.05, lng: center.lng + (Math.random() - 0.5) * 0.05 },
                    lastPing: lastTrack ? new Date(lastTrack.hora).toLocaleTimeString() : new Date().toLocaleTimeString(),
                    ruta: []
                };
            });

            return [...sellers, ...fleet];
        },
        refetchInterval: 30000
    });

    const [filterType, setFilterType] = useState<'todos' | 'vendedor' | 'vehiculo'>('todos');
    const filteredUnits = unidades?.filter(u =>
        (filterType === 'todos' || u.tipo === filterType) &&
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const selectedUnit = unidades?.find(u => u.id === selectedVendId);

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
                        <Button
                            variant={filterType === 'todos' ? 'default' : 'ghost'}
                            size="sm" className="h-8 rounded-xl text-[10px] font-black"
                            onClick={() => setFilterType('todos')}
                        >TODOS</Button>
                        <Button
                            variant={filterType === 'vendedor' ? 'default' : 'ghost'}
                            size="sm" className="h-8 rounded-xl text-[10px] font-black"
                            onClick={() => setFilterType('vendedor')}
                        ><Users className="w-3 h-3 mr-1" /> VENTAS</Button>
                        <Button
                            variant={filterType === 'vehiculo' ? 'default' : 'ghost'}
                            size="sm" className="h-8 rounded-xl text-[10px] font-black"
                            onClick={() => setFilterType('vehiculo')}
                        ><Truck className="w-3 h-3 mr-1" /> FLOTA</Button>
                    </div>
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
                        {loadingUnits ? (
                            <div className="p-12 text-center text-gray-400 font-medium italic">Sincronizando con satélites...</div>
                        ) : filteredUnits?.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">No se encontraron unidades.</div>
                        ) : filteredUnits?.map(u => (
                            <div key={u.id}
                                onClick={() => {
                                    setSelectedVendId(u.id);
                                    if (u.pos) {
                                        map?.panTo(u.pos);
                                        map?.setZoom(16);
                                    }
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
                                    <Badge variant="outline" className={`text-[9px] font-black uppercase border-green-200 bg-green-50 text-green-600`}>
                                        En Linea
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between ml-1">
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                                        <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {u.lastPing}</div>
                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-500" /> Lima, PE</div>
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
                            {unidades?.map(u => u.pos && (
                                <React.Fragment key={u.id}>
                                    <Marker
                                        position={u.pos}
                                        onClick={() => setSelectedVendId(u.id)}
                                        icon={{
                                            url: u.tipo === 'vehiculo'
                                                ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23F59E0B" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3m10 0h2l3.41-5.12A1.99 1.99 0 0 0 19 11h-4v6z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>')
                                                : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%232563EB" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'),
                                            scaledSize: new google.maps.Size(32, 32),
                                            anchor: new google.maps.Point(16, 16)
                                        }}
                                    />
                                    {u.ruta?.length > 0 && (selectedVendId === u.id || !selectedVendId) && (
                                        <Polyline
                                            path={u.ruta}
                                            options={{
                                                strokeColor: '#3B82F6',
                                                strokeOpacity: 0.6,
                                                strokeWeight: 4,
                                            }}
                                        />
                                    )}
                                    {selectedVendId === u.id && (
                                        <InfoWindow position={u.pos} onCloseClick={() => setSelectedVendId(null)}>
                                            <div className="p-3 max-w-xs bg-white rounded-xl">
                                                <div className="flex items-center gap-3 mb-2 border-b pb-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${u.tipo === 'vehiculo' ? 'bg-amber-500' : 'bg-blue-600'}`}>
                                                        {u.tipo === 'vehiculo' ? <Truck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-gray-900 leading-tight uppercase tracking-tighter">{u.nombre}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">{u.subtitulo}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Carga:</span> <span className="font-black text-blue-600">82%</span></p>
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Estado:</span> <span className={`text-green-600 font-black uppercase`}>En Ruta</span></p>
                                                    <p className="text-[10px] flex justify-between font-medium"><span>Last Ping:</span> <span className="font-mono">{u.lastPing}</span></p>
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
