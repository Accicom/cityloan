import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Download, Share, Building2, AlertTriangle, Calendar, DollarSign, Award, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Assessment, BCRAEntity, BCRAHistoricalEntity } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getSituationDescription, getSituationColor, formatPeriod, formatAmount } from '../utils/bcraApi';

interface ResultsPageProps {
  assessment: Partial<Assessment>;
  onBack: () => void;
  onDashboard: () => void;
}

export function ResultsPage({ assessment, onBack, onDashboard }: ResultsPageProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Only save if this is a new assessment (doesn't have an ID) and hasn't been saved yet
    if (user && assessment.client_cuit && !assessment.id && !isSaved) {
      saveAssessment();
    }
  }, [user, assessment, isSaved]);

  const saveAssessment = async () => {
    if (!user || isSaved) return;

    try {
      console.log('💾 Saving assessment with BCRA data...', {
        cuit: assessment.client_cuit,
        hasCurrentData: !!assessment.bcra_debt_data,
        hasHistoricalData: !!assessment.bcra_historical_data,
        bcraStatus: assessment.bcra_eligibility_status
      });

      // Check if an assessment with the same CUIT already exists for this advisor
      const { data: existingAssessment, error: checkError } = await supabase
        .from('assessments')
        .select('id')
        .eq('advisor_id', user.id)
        .eq('client_cuit', assessment.client_cuit!)
        .eq('assessment_result', assessment.assessment_result!)
        .eq('bcra_eligibility_status', assessment.bcra_eligibility_status!)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If no existing assessment found, create a new one
      if (!existingAssessment) {
        const assessmentData = {
          advisor_id: user.id,
          client_cuit: assessment.client_cuit!,
          client_name: assessment.client_name || null,
          assessment_result: assessment.assessment_result!,
          bcra_debt_data: assessment.bcra_debt_data || null,
          bcra_historical_data: assessment.bcra_historical_data || null,
          bcra_eligibility_status: assessment.bcra_eligibility_status || null,
        };

        console.log('📝 Inserting assessment data:', assessmentData);

        const { data, error } = await supabase
          .from('assessments')
          .insert(assessmentData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error saving assessment:', error);
          throw error;
        }

        console.log('✅ Assessment saved successfully:', data.id);
      } else {
        console.log('ℹ️ Assessment already exists, skipping save');
      }

      setIsSaved(true);
    } catch (error) {
      console.error('❌ Error saving assessment:', error);
    }
  };

  const getStatusIcon = () => {
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return <Award className="w-8 h-8 text-green-600" />;
    }
    
    switch (assessment.assessment_result) {
      case 'eligible':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'not_eligible':
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Clock className="w-8 h-8 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return 'text-green-700 bg-green-50 border-green-200';
    }
    
    switch (assessment.assessment_result) {
      case 'eligible':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'not_eligible':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  const getStatusText = () => {
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return 'BCRA APTO';
    }
    
    switch (assessment.assessment_result) {
      case 'eligible':
        return 'Préstamo Aprobado';
      case 'not_eligible':
        return 'Préstamo Denegado';
      default:
        return 'Evaluación Pendiente';
    }
  };

  const getStatusMessage = () => {
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return 'El cliente puede avanzar al siguiente paso';
    }
    
    return null;
  };

  const renderBCRACurrentData = () => {
    if (!assessment.bcra_debt_data) return null;

    const { bcra_debt_data } = assessment;
    const latestPeriod = bcra_debt_data.periodos?.[0];

    return (
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Situación Crediticia Actual</h3>
            <p className="text-sm text-gray-600">Central de Deudores del Sistema Financiero</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Cliente:</span>
            <span className="font-medium">{bcra_debt_data.denominacion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CUIT:</span>
            <span className="font-mono">{bcra_debt_data.identificacion}</span>
          </div>
          {latestPeriod && (
            <div className="flex justify-between">
              <span className="text-gray-600">Último Reporte:</span>
              <span className="font-medium">{formatPeriod(latestPeriod.periodo)}</span>
            </div>
          )}
        </div>

        {latestPeriod && latestPeriod.entidades && latestPeriod.entidades.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Entidades Financieras</h4>
            <div className="space-y-3">
              {latestPeriod.entidades.map((entity: BCRAEntity, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">{entity.entidad}</h5>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getSituationColor(entity.situacion)}`}>
                        Situación {entity.situacion}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">{formatAmount(entity.monto)}</span>
                      </div>
                    </div>
                  </div>

                  {entity.diasAtrasoPago > 0 && (
                    <div className="text-sm text-red-600">
                      Días de atraso: {entity.diasAtrasoPago}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderBCRAHistoricalData = () => {
    if (!assessment.bcra_historical_data) return null;

    const { bcra_historical_data } = assessment;
    
    // Show last 12 months
    const last12Months = bcra_historical_data.periodos.slice(0, 12);

    return (
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Historial Crediticio</h3>
            <p className="text-sm text-gray-600">Últimos 12 meses</p>
          </div>
        </div>

        <div className="space-y-3">
          {last12Months.map((periodo, index) => {
            const worstSituation = Math.max(...periodo.entidades.map(e => e.situacion));
            const totalDebt = periodo.entidades.reduce((sum, e) => sum + e.monto, 0);
            
            return (
              <div key={periodo.periodo} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{formatPeriod(periodo.periodo)}</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-2 ${getSituationColor(worstSituation)}`}>
                      Peor situación: {worstSituation}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatAmount(totalDebt)}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  {periodo.entidades.length} entidad{periodo.entidades.length !== 1 ? 'es' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Resultado de Evaluación</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Main Result Card */}
      <Card className="text-center">
        <div className="mb-6">
          {getStatusIcon()}
          <h2 className={`text-xl font-bold mt-3 mb-2 ${getStatusColor()}`}>
            {getStatusText()}
          </h2>
          
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border text-sm font-medium ${getStatusColor()}`}>
            {assessment.bcra_eligibility_status === 'BCRA_APTO' ? (
              <>
                <Award className="w-4 h-4" />
                <span>Cliente Elegible BCRA</span>
              </>
            ) : assessment.bcra_eligibility_status === 'BCRA_NO_APTO' ? (
              <>
                <XCircle className="w-4 h-4" />
                <span>No Elegible BCRA</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Evaluación Pendiente</span>
              </>
            )}
          </div>
          
          {getStatusMessage() && (
            <p className="text-sm text-green-700 mt-2 font-medium">
              {getStatusMessage()}
            </p>
          )}
        </div>
      </Card>

      {/* Client Information */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Información del Cliente</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">CUIT:</span>
            <span className="font-mono">{assessment.client_cuit}</span>
          </div>
          {assessment.client_name && (
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre:</span>
              <span className="font-medium">{assessment.client_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha de Evaluación:</span>
            <span>{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
          </div>
          {assessment.bcra_eligibility_status && (
            <div className="flex justify-between">
              <span className="text-gray-600">Estado BCRA:</span>
              <span className={`font-medium ${
                assessment.bcra_eligibility_status === 'BCRA_APTO' ? 'text-green-600' : 
                assessment.bcra_eligibility_status === 'BCRA_NO_APTO' ? 'text-red-600' : 'text-amber-600'
              }`}>
                {assessment.bcra_eligibility_status.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* BCRA Current Data */}
      {renderBCRACurrentData()}

      {/* BCRA Historical Data */}
      {renderBCRAHistoricalData()}

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onDashboard}
          className="w-full"
        >
          Volver al Dashboard
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            className="flex items-center justify-center"
          >
            <Share className="w-4 h-4 mr-2" />
            Compartir
          </Button>
        </div>
      </div>
    </div>
  );
}