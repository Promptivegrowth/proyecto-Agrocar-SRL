'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    PackageSearch, Users, Truck, Store, ListOrdered, DollarSign,
    MapPin, BarChart3, BookOpen, Settings, Home, HardDrive, Receipt, FolderOpen
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    interface MenuItem {
        name: string;
        href: string;
        icon: any;
        target?: string;
    }

    interface MenuGroup {
        group: string;
        items: MenuItem[];
    }

    const menuItems: MenuGroup[] = [
        {
            group: 'Maestros', items: [
                { name: 'Productos', href: '/maestros/productos', icon: PackageSearch },
                { name: 'Clientes', href: '/maestros/clientes', icon: Users },
            ]
        },
        {
            group: 'App PWA', items: [
                { name: 'App Vendedores', href: '/app-vendedor', icon: Store, target: '_blank' },
            ]
        },
        {
            group: 'Operativa', items: [
                { name: 'Almacén', href: '/almacen', icon: HardDrive },
                { name: 'Despacho', href: '/despacho', icon: Truck },
                { name: 'Gestión de Flota', href: '/despacho/flota', icon: MapPin },
                { name: 'Facturación', href: '/facturacion/bloque', icon: ListOrdered },
                { name: 'Recibos de Caja', href: '/facturacion/recibos', icon: Receipt },
                { name: 'Cobranzas', href: '/cobranzas/cuentas-corrientes', icon: DollarSign },
            ]
        },
        {
            group: 'Gestión y Control', items: [
                { name: 'Supervisión GPS', href: '/supervision/mapa', icon: MapPin },
                { name: 'Control de Asistencia', href: '/supervision/asistencia', icon: Users },
                { name: 'Archivos', href: '/archivos', icon: FolderOpen },
                { name: 'Reportes', href: '/reportes/dashboard', icon: BarChart3 },
                { name: 'Contabilidad (PLE)', href: '/contabilidad/registro-ventas', icon: BookOpen },
                { name: 'Configuración', href: '/configuracion/empresa', icon: Settings },
            ]
        },
    ];
    return (
        <aside className="w-64 bg-primary text-primary-foreground flex-shrink-0 min-h-screen flex flex-col">
            <div className="p-4 bg-primary font-bold text-xl tracking-tight border-b border-primary-foreground/10 text-center">
                <span className="text-secondary">AGROCAR</span> ERP
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1">
                    <li>
                        <Link
                            href="/"
                            className={`flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors ${pathname === '/' ? 'bg-white/10 text-secondary' : ''}`}
                        >
                            <Home className="mr-3 h-5 w-5" /> Inicio
                        </Link>
                    </li>

                    {menuItems.map((group) => (
                        <div key={group.group}>
                            <li className="pt-4 pb-1 px-4 text-xs font-semibold text-primary-foreground/50 uppercase">{group.group}</li>
                            {group.items.map((item) => {
                                const isActive = pathname?.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            target={item.target}
                                            className={`flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors ${isActive ? 'bg-white/10 text-secondary font-bold' : ''}`}
                                        >
                                            <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-secondary' : ''}`} />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </div>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
