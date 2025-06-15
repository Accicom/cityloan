import React, { useState } from 'react';
import { ArrowLeft, CreditCard, AlertCircle, Building2, TrendingUp } from 'lucide-react';
import { formatCuit, isValidCuit } from '../utils/cuit';
import { performLoanAssessment } from '../utils/assessment';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface AssessmentPageProps {
  onBack: () => void;
  onComplete: (assessment: any) => void;
}

export function AssessmentPage({ onBack, onComplete }: AssessmentPageProps) {
  const [cuit, setCuit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessmentStep, setAssessmentStep] = useState<'input' | 'processing' | 'bcra-current' | 'bcra-historical' | 'analyzing'>('input');

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCuit(e.target.value);
    setCuit(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidCuit(cuit)) {
      setError('Please enter a valid CUIT number');
      return;
    }

    setLoading(true);
    setError('');
    setAssessmentStep('processing');

    try {
      // Show different steps during the process
      setTimeout(() => {
        if (loading) setAssessmentStep('bcra-current');
      }, 1000);

      setTimeout(() => {
        if (loading) setAssessmentStep('bcra-historical');
      }, 2000);

      setTimeout(() => {
        if (loading) setAssessmentStep('analyzing');
      }, 3000);

      const result = await performLoanAssessment(cuit);
      onComplete({
        client_cuit: cuit,
        client_name: result.clientName,
        assessment_result: result.result,
        eligibility_score: result.score,
        eligibility_factors: result.factors,
        bcra_debt_data: result.bcraData,
        bcra_historical_data: result.bcraHistoricalData,
        bcra_eligibility_status: result.bcraEligibilityStatus,
      });
    } catch (error) {
      setError('Failed to perform assessment. Please try again.');
      console.error('Assessment error:', error);
      setAssessmentStep('input');
    } finally {
      setLoading(false);
    }
  };

  const renderLoadingStep = () => {
    switch (assessmentStep) {
      case 'processing':
        return (
          <Card className="mt-6">
            <div className="text-center py-6">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Iniciando Evaluación</h3>
              <p className="text-gray-600">
                Preparando consulta de datos crediticios...
              </p>
            </div>
          </Card>
        );
      
      case 'bcra-current':
        return (
          <Card className="mt-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Consultando BCRA</h3>
              <p className="text-gray-600 mb-2">
                Obteniendo situación crediticia actual...
              </p>
              <p className="text-sm text-gray-500">
                Central de Deudores del Sistema Financiero
              </p>
            </div>
          </Card>
        );

      case 'bcra-historical':
        return (
          <Card className="mt-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analizando Historial</h3>
              <p className="text-gray-600 mb-2">
                Consultando últimos 24 meses de historial crediticio...
              </p>
              <p className="text-sm text-gray-500">
                Verificando cumplimiento de criterios de elegibilidad
              </p>
            </div>
          </Card>
        );

      case 'analyzing':
        return (
          <Card className="mt-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-purple-600" />
              </div>
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Procesando Análisis</h3>
              <p className="text-gray-600 mb-2">
                Evaluando criterios de elegibilidad BCRA...
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>• Situación actual ≤ 1</p>
                <p>• Últimos 6 meses ≤ 1</p>
                <p>• Últimos 12 meses ≤ 2</p>
              </div>
            </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="mb-4 p-2"
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nueva Evaluación Crediticia</h1>
        <p className="text-gray-600">Ingrese el CUIT del cliente para iniciar la evaluación BCRA</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Información del Cliente</h2>
          </div>

          <Input
            type="text"
            label="CUIT (Código Único de Identificación Tributaria)"
            placeholder="XX-XXXXXXXX-X"
            value={cuit}
            onChange={handleCuitChange}
            error={error}
            hint="Formato: 11 dígitos con código de verificación"
            required
            disabled={loading}
            maxLength={13}
            className="text-center font-mono text-lg"
          />

          {cuit && isValidCuit(cuit) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">CUIT válido</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Evaluación BCRA</p>
                <p className="mb-2">Sistema de evaluación basado en criterios del Banco Central:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Situación crediticia actual ≤ 1</li>
                  <li>Últimos 6 meses ≤ 1</li>
                  <li>Últimos 12 meses ≤ 2</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Proceso de Evaluación</p>
                <p>Se realizará consulta en tiempo real a la Central de Deudores del BCRA para obtener el historial crediticio completo del cliente.</p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!cuit || !isValidCuit(cuit)}
            loading={loading}
          >
            {loading ? 'Procesando Evaluación...' : 'Iniciar Evaluación BCRA'}
          </Button>
        </form>
      </Card>

      {loading && renderLoadingStep()}
    </div>
  );
}