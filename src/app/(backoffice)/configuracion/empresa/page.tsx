'use client';

import { Save, Building2, Key, UsersRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmpresaConfigPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
                <p className="text-gray-500 mt-1">Ajustes globales de la empresa emisora, Facturación y Seguridad</p>
            </div>

            <Tabs defaultValue="general" className="max-w-4xl">
                <TabsList className="bg-gray-100 p-1 mb-4 h-auto">
                    <TabsTrigger value="general" className="py-2 px-6"><Building2 className="w-4 h-4 mr-2" /> Empresa</TabsTrigger>
                    <TabsTrigger value="facturacion" className="py-2 px-6"><Key className="w-4 h-4 mr-2" /> Credenciales OSE / SUNAT</TabsTrigger>
                    <TabsTrigger value="usuarios" className="py-2 px-6"><UsersRound className="w-4 h-4 mr-2" /> Usuarios y Roles</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-0">
                    <Card>
                        <CardHeader><CardTitle>Datos Fiscales (Emisor)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-sm font-medium">RUC</label><Input defaultValue="20123456789" /></div>
                                <div className="space-y-2"><label className="text-sm font-medium">Razón Social</label><Input defaultValue="AGROCAR SRL" /></div>
                            </div>
                            <div className="space-y-2"><label className="text-sm font-medium">Dirección Comercial</label><Input defaultValue="Av. Central 123, Callao" /></div>
                            <Button className="mt-4"><Save className="w-4 h-4 mr-2" /> Guardar Cambios</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="facturacion" className="mt-0">
                    <Card>
                        <CardHeader><CardTitle>Configuración SUNAT</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-sm font-medium">Usuario SOL</label><Input defaultValue="AGROUSER" /></div>
                                <div className="space-y-2"><label className="text-sm font-medium">Clave SOL</label><Input type="password" defaultValue="******" /></div>
                            </div>
                            <Button className="mt-4"><Save className="w-4 h-4 mr-2" /> Guardar Credenciales</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
