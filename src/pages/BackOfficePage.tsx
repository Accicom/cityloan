import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Search, FileText, Plus, Eye, Clock, CheckCircle, XCircle, Building2, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Assessment, LoanOperation } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface BackOfficePageProps {
  onBack: () => void;
  onStartLoanApplication: (assessment: Assessment) => void;
  onViewLoanOperation: (operation: LoanOperation) => void;
}

export function BackOfficePage({ onBack, onStartLoanApplication, onViewLoanOperation }: BackOfficePageProps) {
  const { user } = useAuth();
  const [approvedAssessments, setApprovedAssessments] = useState<Assessment[]>([]);
  const [loanOperations, setLoanOperations] = useState<LoanOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'approved' | 'operations'>('approved');

  const fetchApprovedAssessments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('advisor_id', user.id)
        .eq('bcra_eligibility_status', 'BCRA_APTO')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovedAssessments(data || []);
    } catch (error) {
      console.error('Error fetching approved assessments:', error);
    }
  }, [user]);

  const fetchLoanOperations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('loan_operations')
        .select('*')
        .eq('advisor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoanOperations(data || []);
    } catch (error) {
      console.error('Error fetching loan operations:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchApprovedAssessments(), fetchLoanOperations()])
        .finally(() => setLoading(false));
    }
  }, [user, fetchApprovedAssessments, fetchLoanOperations]);

  const filteredApprovedAssessments = useMemo(() => {
    if (!searchTerm) return approvedAssessments;
    
    const term = searchTerm.toLowerCase();
    return approvedAssessments.filter(assessment => 
      assessment.client_cuit.includes(searchTerm) ||
      (assessment.client_name && assessment.client_name.toLowerCase().includes(term))
    );
  }, [approvedAssessments, searchTerm]);

  const filteredLoanOperations = useMemo(() => {
    if (!searchTerm) return loanOperations;
    
    const term = searchTerm.toLowerCase();
    return loanOperations.filter(operation => 
      operation.client_cuit.includes(searchTerm) ||
      operation.operation_number.toLowerCase().includes(term) ||
      (operation.client_name && operation.client_name.toLowerCase().includes(term))
    );
  }, [loanOperations, searchTerm]);

  // Check if an assessment already has a completed operation
  const hasCompletedOperation = useCallback((assessmentId: string) => {
    return loanOperations.some(op => 
      op.assessment_id === assessmentId && op.status === 'completed'
    );
  }, [loanOperations]);

  // Check if an assessment has any operation (completed or in progress)
  const hasAnyOperation = useCallback((assessmentId: string) => {
    return loanOperations.some(op => op.assessment_id === assessmentId);
  }, [loanOperations]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const getOperationStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getOperationStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getOperationStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'COMPLETADA';
      case 'rejected':
        return 'RECHAZADA';
      case 'in_progress':
        return 'EN PROCESO';
      default:
        return 'PENDIENTE';
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'contact_info':
        return 'Información de Contacto';
      case 'documents':
        return 'Documentos';
      case 'veraz_data':
        return 'Datos VERAZ';
      case 'verification':
        return 'Verificación';
      default:
        return stage;
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">BackOffice</h1>
        <div className="w-10"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{approvedAssessments.length}</div>
            <div className="text-sm text-gray-600">Aprobados BCRA</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{loanOperations.length}</div>
            <div className="text-sm text-gray-600">Operaciones</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'approved'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Clientes Aprobados
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'operations'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Operaciones
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Buscar por CUIT, nombre o número de operación..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Content */}
      {activeTab === 'approved' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Clientes Aprobados BCRA
            </h2>
          </div>

          {filteredApprovedAssessments.length > 0 ? (
            <div className="space-y-3">
              {filteredApprovedAssessments.map((assessment) => {
                const isCompleted = hasCompletedOperation(assessment.id);
                const hasOperation = hasAnyOperation(assessment.id);
                
                return (
                  <Card key={assessment.id} className="cursor-pointer hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-green-600" />
                        <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                          BCRA APTO
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                            OPERACIÓN COMPLETADA
                          </span>
                        )}
                      </div>
                      
                      {isCompleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const operation = loanOperations.find(op => 
                              op.assessment_id === assessment.id && op.status === 'completed'
                            );
                            if (operation) {
                              onViewLoanOperation(operation);
                            }
                          }}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Resumen</span>
                        </Button>
                      ) : hasOperation ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            const operation = loanOperations.find(op => op.assessment_id === assessment.id);
                            if (operation) {
                              onViewLoanOperation(operation);
                            }
                          }}
                          className="flex items-center space-x-1"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Continuar</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onStartLoanApplication(assessment)}
                          className="flex items-center space-x-1"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Iniciar</span>
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">CUIT</p>
                        <p className="font-mono text-sm">{assessment.client_cuit}</p>
                      </div>
                      
                      {assessment.client_name && (
                        <div>
                          <p className="text-sm text-gray-500">Cliente</p>
                          <p className="font-medium">{assessment.client_name}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm text-gray-500">Aprobado</p>
                        <p className="text-sm">
                          {new Date(assessment.created_at).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Building2 className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes aprobados'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Intenta ajustar los términos de búsqueda' 
                  : 'Los clientes con estado BCRA APTO aparecerán aquí'
                }
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'operations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Operaciones de Préstamo
            </h2>
          </div>

          {filteredLoanOperations.length > 0 ? (
            <div className="space-y-3">
              {filteredLoanOperations.map((operation) => (
                <Card 
                  key={operation.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                  onClick={() => onViewLoanOperation(operation)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getOperationStatusIcon(operation.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getOperationStatusColor(operation.status)}`}>
                        {getOperationStatusText(operation.status)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewLoanOperation(operation);
                      }}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{operation.status === 'completed' ? 'Resumen' : 'Ver'}</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Número de Operación</p>
                      <p className="font-mono text-sm font-medium">{operation.operation_number}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">CUIT</p>
                      <p className="font-mono text-sm">{operation.client_cuit}</p>
                    </div>
                    
                    {operation.client_name && (
                      <div>
                        <p className="text-sm text-gray-500">Cliente</p>
                        <p className="font-medium">{operation.client_name}</p>
                      </div>
                    )}
                    
                    {operation.status !== 'completed' && (
                      <div>
                        <p className="text-sm text-gray-500">Etapa Actual</p>
                        <p className="text-sm font-medium">{getStageText(operation.current_stage)}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-500">
                        {operation.status === 'completed' ? 'Completado' : 'Creado'}
                      </p>
                      <p className="text-sm">
                        {new Date(operation.status === 'completed' ? operation.updated_at : operation.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron operaciones' : 'No hay operaciones'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Intenta ajustar los términos de búsqueda' 
                  : 'Las operaciones de préstamo aparecerán aquí'
                }
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}