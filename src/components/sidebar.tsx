import Link from 'next/link';
import {
    PackageSearch, Users, Truck, Store, ListOrdered, DollarSign,
    MapPin, BarChart3, BookOpen, Settings, Home, HardDrive, Receipt
} from 'lucide-react';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-primary text-primary-foreground flex-shrink-0 min-h-screen flex flex-col">
            <div className="p-4 bg-primary font-bold text-xl tracking-tight border-b border-primary-foreground/10 text-center">
                <span className="text-secondary">AGROCAR</span> ERP
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1">
                    <li><Link href="/" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Home className="mr-3 h-5 w-5" /> Inicio</Link></li>

                    <li className="pt-4 pb-1 px-4 text-xs font-semibold text-primary-foreground/50 uppercase">Maestros</li>
                    <li><Link href="/maestros/productos" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><PackageSearch className="mr-3 h-5 w-5" /> Productos</Link></li>
                    <li><Link href="/maestros/clientes" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Users className="mr-3 h-5 w-5" /> Clientes</Link></li>

                    <li className="pt-4 pb-1 px-4 text-xs font-semibold text-primary-foreground/50 uppercase">App PWA</li>
                    <li><Link href="/app-vendedor" target="_blank" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Store className="mr-3 h-5 w-5" /> App Vendedores</Link></li>

                    <li className="pt-4 pb-1 px-4 text-xs font-semibold text-primary-foreground/50 uppercase">Operativa</li>
                    <li><Link href="/almacen" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><HardDrive className="mr-3 h-5 w-5" /> Almacén</Link></li>
                    <li><Link href="/despacho" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Truck className="mr-3 h-5 w-5" /> Despacho</Link></li>
                    <li><Link href="/despacho/flota" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors text-secondary/80 hover:text-secondary"><MapPin className="mr-3 h-5 w-5 text-secondary/60" /> Gestión de Flota</Link></li>
                    <li><Link href="/facturacion/bloque" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><ListOrdered className="mr-3 h-5 w-5" /> Facturación</Link></li>
                    <li><Link href="/facturacion/recibos" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Receipt className="mr-3 h-5 w-5" /> Recibos de Caja</Link></li>
                    <li><Link href="/cobranzas/cuentas-corrientes" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><DollarSign className="mr-3 h-5 w-5" /> Cobranzas</Link></li>

                    <li className="pt-4 pb-1 px-4 text-xs font-semibold text-primary-foreground/50 uppercase">Gestión y Control</li>
                    <li><Link href="/supervision/mapa" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><MapPin className="mr-3 h-5 w-5" /> Supervisión GPS</Link></li>
                    <li><Link href="/supervision/asistencia" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Users className="mr-3 h-5 w-5" /> Control de Asistencia</Link></li>
                    <li><Link href="/reportes/dashboard" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><BarChart3 className="mr-3 h-5 w-5" /> Reportes</Link></li>
                    <li><Link href="/contabilidad/registro-ventas" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><BookOpen className="mr-3 h-5 w-5" /> Contabilidad (PLE)</Link></li>
                    <li><Link href="/configuracion/empresa" className="flex items-center px-4 py-2 hover:bg-white/10 hover:text-secondary transition-colors"><Settings className="mr-3 h-5 w-5" /> Configuración</Link></li>
                </ul>
            </nav>
        </aside>
    );
}
