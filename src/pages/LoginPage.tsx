import React, { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6">
            <img 
              src="https://smrotxzmhoivbutdjbxm.supabase.co/storage/v1/object/public/logo//logo_city.png" 
              alt="Logo" 
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-md">Portal de Evaluación de Préstamos</h1>
          <p className="text-gray-300">Inicia sesión en tu cuenta</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Dirección de Email"
              placeholder="Ingresa tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />

            <Input
              type="password"
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">Error de Autenticación</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={!email || !password}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-300">
            Usa tus credenciales de Supabase Auth para iniciar sesión
          </p>
        </div>
      </div>
    </div>
  );
}