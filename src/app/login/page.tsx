import { login } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { error?: string }
}) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-[#1A2C45] rounded-xl flex items-center justify-center mb-4 shadow-sm">
                        <span className="text-[#F6C519] font-bold text-2xl">AG</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Agrocar ERP</h1>
                    <p className="text-gray-500 mt-2">Inicia sesión para acceder al sistema</p>
                </div>

                <form action={login} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="usuario@agrocar.com.pe"
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            className="w-full"
                        />
                    </div>

                    {searchParams?.error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                            {searchParams.error}
                        </div>
                    )}

                    <Button
                        formAction={login}
                        className="w-full bg-[#1A2C45] hover:bg-[#1A2C45]/90 text-white font-medium py-2 rounded-lg"
                    >
                        Ingresar al Sistema
                    </Button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Promptive. Todos los derechos reservados.</p>
                </div>
            </div>
        </div>
    )
}
