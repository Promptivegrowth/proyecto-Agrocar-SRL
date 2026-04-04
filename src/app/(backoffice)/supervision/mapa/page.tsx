'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Navigation } from 'lucide-react';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem'
};

const center = { lat: -12.0464, lng: -77.0428 }; // Lima, Peru

export default function SupervisionMapaPage() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const vendedores = [
        {
            id: 1,
            nombre: 'Julio Pérez',
            lastPing: 'Hace 2 min',
            pos: { lat: -12.092, lng: -77.022 },
            activo: true,
            distrito: 'San Isidro',
            ruta: [
                { lat: -12.085, lng: -77.015 },
                { lat: -12.088, lng: -77.018 },
                { lat: -12.092, lng: -77.022 },
            ]
        },
        {
            id: 2,
            nombre: 'Carmen Rosas',
            lastPing: 'Hace 5 min',
            pos: { lat: -12.122, lng: -77.028 },
            activo: true,
            distrito: 'Miraflores',
            ruta: [
                { lat: -12.112, lng: -77.022 },
                { lat: -12.118, lng: -77.025 },
                { lat: -12.122, lng: -77.028 },
            ]
        },
        {
            id: 3,
            nombre: 'Luis Arrieta',
            lastPing: 'Hace 15 min',
            pos: { lat: -12.129, lng: -76.992 },
            activo: true,
            distrito: 'Surco',
            ruta: [
                { lat: -12.120, lng: -76.985 },
                { lat: -12.125, lng: -76.988 },
                { lat: -12.129, lng: -76.992 },
            ]
        },
        {
            id: 4,
            nombre: 'Raúl Mendoza',
            lastPing: 'Hace 45 min',
            pos: { lat: -12.055, lng: -76.955 },
            activo: false,
            distrito: 'Ate',
            ruta: []
        },
        {
            id: 5,
            nombre: 'Sofía Castro',
            lastPing: 'Hace 1 min',
            pos: { lat: -12.045, lng: -77.035 },
            activo: true,
            distrito: 'Lima Centro',
            ruta: [
                { lat: -12.040, lng: -77.030 },
                { lat: -12.042, lng: -77.032 },
                { lat: -12.045, lng: -77.035 },
            ]
        },
    ];

    const [selectedVend, setSelectedVend] = useState<number | null>(null);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Supervisión GPS en Tiempo Real</h1>
                    <p className="text-gray-500 mt-1">Ubicación de flota, check-ins y rutas del día</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" /> Live Tracking Active</Badge>
                </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                        <CardTitle className="text-sm">Vendedores en Ruta</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <Input placeholder="Buscar vendedor..." className="h-7 text-xs pl-7" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-y-auto divide-y divide-gray-100">
                        {vendedores.map(v => (
                            <div key={v.id}
                                onClick={() => {
                                    setSelectedVend(v.id);
                                    map?.panTo(v.pos);
                                    map?.setZoom(15);
                                }}
                                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors group ${selectedVend === v.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${v.activo ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {v.nombre}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] uppercase">{v.distrito}</Badge>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[10px] text-gray-500 ml-4">Último ping: {v.lastPing}</p>
                                    <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                                        <Navigation className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1 relative">
                    {!isLoaded ? (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            Cargando Google Maps API...
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={13}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            options={{ disableDefaultUI: true, zoomControl: true }}
                        >
                            {vendedores.map(v => (
                                <React.Fragment key={v.id}>
                                    <Marker
                                        position={v.pos}
                                        onClick={() => setSelectedVend(v.id)}
                                        icon={{
                                            url: v.activo ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                            scaledSize: new google.maps.Size(40, 40)
                                        }}
                                    />
                                    {v.ruta.length > 0 && (
                                        <Polyline
                                            path={v.ruta}
                                            options={{
                                                strokeColor: v.id === 1 ? '#3B82F6' : v.id === 2 ? '#EC4899' : '#10B981',
                                                strokeOpacity: 0.8,
                                                strokeWeight: 4,
                                            }}
                                        />
                                    )}
                                    {selectedVend === v.id && (
                                        <InfoWindow position={v.pos} onCloseClick={() => setSelectedVend(null)}>
                                            <div className="p-2">
                                                <p className="font-bold text-sm">{v.nombre}</p>
                                                <p className="text-[10px] text-gray-500 uppercase">{v.distrito}</p>
                                                <p className="text-[10px] mt-1">Velocidad: 24 km/h</p>
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
