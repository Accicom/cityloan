import React from 'react';
import { LogOut, User, Building } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

interface HeaderProps {
  onBackOfficeClick?: () => void;
}

export function Header({ onBackOfficeClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src="https://smrotxzmhoivbutdjbxm.supabase.co/storage/v1/object/public/logo//logo_city.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Evaluación de Préstamos</h1>
            {user && (
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            )}
          </div>
        </div>
        
        {user && (
          <div className="flex items-center space-x-2">
            {onBackOfficeClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackOfficeClick}
                className="p-2"
                aria-label="Back Office"
              >
                <Building size={16} />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="p-2"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}