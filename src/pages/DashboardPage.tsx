import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Assessment } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AssessmentCard } from '../components/AssessmentCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface DashboardPageProps {
  onNewAssessment: () => void;
  onViewAssessment: (assessment: Assessment) => void;
}

export function DashboardPage({ onNewAssessment, onViewAssessment }: DashboardPageProps) {
  const { user, signOut } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching assessments for user:', user.id);
      
      // Check if Supabase client is properly configured
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('🔄 No active session, signing out user');
        signOut();
        return;
      }
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('advisor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching assessments:', error);
        
        // Check for authentication errors
        if (error.message?.includes('JWT expired') || 
            error.message?.includes('invalid JWT') ||
            error.message?.includes('session_not_found')) {
          console.log('🔄 Authentication error, signing out user');
          signOut();
          return;
        }
        
        throw error;
      }

      console.log('✅ Assessments fetched successfully:', data?.length || 0);
      setAssessments(data || []);
    } catch (error) {
      console.error('❌ Error in fetchAssessments:', error);
      
      let errorMessage = 'Failed to load assessments';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network error occurred. Please check your connection.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Connection blocked by browser security. Please contact support.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // If it's an auth error, clear assessments
      if (errorMessage.includes('JWT') || errorMessage.includes('auth') || errorMessage.includes('session')) {
        setAssessments([]);
        signOut();
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, signOut]);

  useEffect(() => {
    let mounted = true;
    
    if (user) {
      fetchAssessments().then(() => {
        if (!mounted) return;
        // Assessment fetch completed
      });
    } else {
      setLoading(false);
      setAssessments([]);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredAssessments = useMemo(() => {
    if (!searchTerm) return assessments;
    
    const term = searchTerm.toLowerCase();
    return assessments.filter(assessment => 
      assessment.client_cuit.includes(searchTerm) ||
      (assessment.client_name && assessment.client_name.toLowerCase().includes(term))
    );
  }, [assessments, searchTerm]);

  const stats = useMemo(() => {
    const total = assessments.length;
    const eligible = assessments.filter(a => 
      a.assessment_result === 'eligible' || a.bcra_eligibility_status === 'BCRA_APTO'
    ).length;
    return { total, eligible };
  }, [assessments]);

  const recentAssessments = useMemo(() => 
    filteredAssessments.slice(0, 10),
    [filteredAssessments]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleRetry = useCallback(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  if (!user) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Evaluaciones</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.eligible}</div>
            <div className="text-sm text-gray-600">Clientes Elegibles</div>
          </div>
        </Card>
      </div>

      {/* New Assessment Button */}
      <Button 
        onClick={onNewAssessment}
        className="w-full"
        size="lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        Nueva Evaluación
      </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Buscar por CUIT o nombre..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="text-center py-4">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar evaluaciones</h3>
            <p className="text-red-700 mb-4 text-sm">{error}</p>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
            >
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Assessments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Evaluaciones Recientes
          </h2>
          {stats.total > 10 && (
            <span className="text-sm text-gray-500">
              Mostrando {Math.min(10, filteredAssessments.length)} de {filteredAssessments.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : recentAssessments.length > 0 ? (
          <div className="space-y-3">
            {recentAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onClick={() => onViewAssessment(assessment)}
              />
            ))}
          </div>
        ) : !error ? (
          <Card className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <History className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron evaluaciones' : 'No hay evaluaciones aún'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Intenta ajustar los términos de búsqueda' 
                : 'Comienza creando tu primera evaluación de préstamo'
              }
            </p>
            {!searchTerm && (
              <Button onClick={onNewAssessment}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Evaluación
              </Button>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}