import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, FileText, BarChart3, CheckSquare, Upload, Calendar, Phone, Mail, DollarSign, AlertCircle, Award, Building2, Eye, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Assessment, LoanOperation, ContactInfo, DocumentsInfo, VerazData, VerificationData } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatAmount } from '../utils/bcraApi';
import { uploadDocument, getDocumentUrl, StorageError } from '../utils/storage';
import { exportDigitalFile } from '../utils/pdfExport';

interface LoanApplicationPageProps {
  assessment?: Assessment | null;
  operation?: LoanOperation | null;
  onBack: () => void;
  onComplete: () => void;
}

type Stage = 'contact_info' | 'documents' | 'veraz_data' | 'verification';

export function LoanApplicationPage({ assessment, operation, onBack, onComplete }: LoanApplicationPageProps) {
  const { user } = useAuth();
  const [currentStage, setCurrentStage] = useState<Stage>('contact_info');
  const [loading, setLoading] = useState(false);
  const [operationData, setOperationData] = useState<LoanOperation | null>(operation || null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [exportingPDF, setExportingPDF] = useState(false);
  const [fetchedAssessment, setFetchedAssessment] = useState<Assessment | null>(null);
  
  // Form data states
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const [documentsInfo, setDocumentsInfo] = useState<DocumentsInfo>({});
  const [verazData, setVerazData] = useState<VerazData>({});
  const [verificationData, setVerificationData] = useState<VerificationData>({});

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (operationData) {
      console.log('📋 Loading operation data:', operationData.current_stage, 'Status:', operationData.status);
      setCurrentStage(operationData.current_stage);
      setContactInfo(operationData.contact_info || {});
      setDocumentsInfo(operationData.documents || {});
      setVerazData(operationData.veraz_data || {});
      setVerificationData(operationData.verification_data || {});
      
      // Set read-only mode if operation is completed
      setIsReadOnly(operationData.status === 'completed');

      // If we have an operation but no assessment, fetch the assessment data
      if (operationData.assessment_id && !assessment) {
        fetchAssessmentData(operationData.assessment_id);
      }
    }
  }, [operationData, assessment]);

  const fetchAssessmentData = async (assessmentId: string) => {
    try {
      console.log('🔍 Fetching assessment data for ID:', assessmentId);
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) {
        console.error('❌ Error fetching assessment:', error);
        return;
      }

      console.log('✅ Assessment data fetched:', data);
      setFetchedAssessment(data);
    } catch (error) {
      console.error('❌ Error in fetchAssessmentData:', error);
    }
  };

  const generateOperationNumber = async (): Promise<string> => {
    console.log('🔢 Generating operation number...');
    
    try {
      const { data, error } = await supabase.rpc('generate_operation_number');
      
      if (error) {
        console.error('❌ Error calling generate_operation_number:', error);
        throw new Error(`Database function error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No operation number returned from database function');
      }
      
      console.log('✅ Generated operation number:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to generate operation number:', error);
      
      // Fallback: generate a simple operation number client-side
      const fallbackNumber = `OP${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      console.log('🔄 Using fallback operation number:', fallbackNumber);
      return fallbackNumber;
    }
  };

  const createOrUpdateOperation = useCallback(async (stage: Stage, stageData: any) => {
    if (!user || (!assessment && !operationData)) return;

    try {
      setLoading(true);
      setSubmitError('');
      
      console.log('💾 Saving operation data for stage:', stage);
      console.log('📊 Stage data:', stageData);

      if (operationData) {
        // Update existing operation
        console.log('🔄 Updating existing operation:', operationData.id);
        
        const updateData: any = {
          current_stage: stage,
          status: stage === 'verification' ? 'completed' : 'in_progress',
        };

        switch (stage) {
          case 'contact_info':
            updateData.contact_info = stageData;
            break;
          case 'documents':
            updateData.documents = stageData;
            break;
          case 'veraz_data':
            updateData.veraz_data = stageData;
            break;
          case 'verification':
            updateData.verification_data = stageData;
            break;
        }

        console.log('📝 Update data:', updateData);

        const { data, error } = await supabase
          .from('loan_operations')
          .update(updateData)
          .eq('id', operationData.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating operation:', error);
          throw new Error(`Failed to update operation: ${error.message}`);
        }
        
        console.log('✅ Operation updated successfully:', data.id);
        setOperationData(data);
        return data;
      } else if (assessment) {
        // Create new operation
        console.log('🆕 Creating new operation for assessment:', assessment.id);
        
        const operationNumber = await generateOperationNumber();
        
        const insertData = {
          operation_number: operationNumber,
          assessment_id: assessment.id,
          advisor_id: user.id,
          client_cuit: assessment.client_cuit,
          client_name: assessment.client_name,
          current_stage: stage,
          status: 'in_progress' as const,
          contact_info: stage === 'contact_info' ? stageData : {},
          documents: stage === 'documents' ? stageData : {},
          veraz_data: stage === 'veraz_data' ? stageData : {},
          verification_data: stage === 'verification' ? stageData : {},
        };

        console.log('📝 Insert data:', insertData);

        const { data, error } = await supabase
          .from('loan_operations')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating operation:', error);
          throw new Error(`Failed to create operation: ${error.message}`);
        }
        
        console.log('✅ Operation created successfully:', data.id);
        setOperationData(data);
        return data;
      }
    } catch (error) {
      console.error('❌ Error in createOrUpdateOperation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSubmitError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, assessment, operationData]);

  const validateContactInfo = (data: ContactInfo): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.date_of_birth) {
      errors.date_of_birth = 'La fecha de nacimiento es requerida';
    }
    
    if (!data.phone_number) {
      errors.phone_number = 'El número de teléfono es requerido';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(data.phone_number)) {
      errors.phone_number = 'Formato de teléfono inválido';
    }
    
    if (!data.email_address) {
      errors.email_address = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
      errors.email_address = 'Formato de email inválido';
    }
    
    return errors;
  };

  const validateDocuments = (data: DocumentsInfo): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.id_card_front) {
      errors.id_card_front = 'La foto del frente del DNI es requerida';
    }
    
    if (!data.id_card_back) {
      errors.id_card_back = 'La foto del dorso del DNI es requerida';
    }
    
    return errors;
  };

  const validateVerazData = (data: VerazData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.credit_score) {
      errors.credit_score = 'El puntaje crediticio es requerido';
    }
    
    if (!data.current_status) {
      errors.current_status = 'El estado actual es requerido';
    }
    
    if (data.maximum_delay_24m === undefined) {
      errors.maximum_delay_24m = 'El máximo atraso es requerido';
    }
    
    if (data.financial_system_debt_balance === undefined) {
      errors.financial_system_debt_balance = 'El saldo de deuda es requerido';
    }
    
    if (data.veraz_report_income === undefined) {
      errors.veraz_report_income = 'Los ingresos reportados son requeridos';
    }
    
    if (data.financial_inquiries_6m === undefined) {
      errors.financial_inquiries_6m = 'Las consultas financieras son requeridas';
    }
    
    if (data.payment_amount === undefined) {
      errors.payment_amount = 'El monto de cuota es requerido';
    }
    
    if (data.requested_amount === undefined) {
      errors.requested_amount = 'El monto solicitado es requerido';
    }
    
    if (data.payment_to_income_ratio === undefined) {
      errors.payment_to_income_ratio = 'La relación cuota/ingreso es requerida';
    }
    
    return errors;
  };

  const validateVerification = (data: VerificationData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (data.employment_status_verified === undefined) {
      errors.employment_status_verified = 'La verificación de empleo es requerida';
    }
    
    if (data.identity_verified === undefined) {
      errors.identity_verified = 'La verificación de identidad es requerida';
    }
    
    return errors;
  };

  const handleNext = async () => {
    // Prevent multiple executions
    if (loading) {
      console.log('⏳ Already processing, ignoring duplicate click');
      return;
    }

    // Don't allow progression if in read-only mode
    if (isReadOnly) {
      console.log('🔒 Operation is completed, cannot modify');
      return;
    }

    console.log('🚀 Starting handleNext for stage:', currentStage);
    
    let stageData: any;
    let validationErrors: Record<string, string> = {};

    switch (currentStage) {
      case 'contact_info':
        stageData = contactInfo;
        validationErrors = validateContactInfo(contactInfo);
        console.log('📞 Contact info data:', stageData);
        break;
      case 'documents':
        stageData = documentsInfo;
        validationErrors = validateDocuments(documentsInfo);
        console.log('📄 Documents data:', stageData);
        break;
      case 'veraz_data':
        stageData = verazData;
        validationErrors = validateVerazData(verazData);
        console.log('📊 Veraz data:', stageData);
        break;
      case 'verification':
        stageData = verificationData;
        validationErrors = validateVerification(verificationData);
        console.log('✅ Verification data:', stageData);
        break;
    }

    console.log('🔍 Validation errors:', validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitError('Por favor, corrija los errores en el formulario');
      return;
    }

    setErrors({});
    setSubmitError('');

    try {
      console.log('💾 Calling createOrUpdateOperation...');
      const updatedOperation = await createOrUpdateOperation(currentStage, stageData);

      // Move to next stage or complete
      const stages: Stage[] = ['contact_info', 'documents', 'veraz_data', 'verification'];
      const currentIndex = stages.indexOf(currentStage);
      
      if (currentIndex < stages.length - 1) {
        const nextStage = stages[currentIndex + 1];
        console.log('➡️ Moving to next stage:', nextStage);
        
        // Update the current stage in the UI
        setCurrentStage(nextStage);
        
        // Also update the operation data to reflect the new stage
        if (updatedOperation) {
          setOperationData(prev => prev ? { ...prev, current_stage: nextStage } : null);
        }
      } else {
        // Completed all stages
        console.log('🎉 All stages completed');
        setIsReadOnly(true); // Set to read-only mode
        onComplete();
      }
    } catch (error) {
      console.error('❌ Error in handleNext:', error);
      // Error is already set in createOrUpdateOperation
    }
  };

  const handleFileUpload = async (file: File, field: string) => {
    if (!operationData) {
      setErrors(prev => ({ ...prev, [field]: 'Debe guardar la operación antes de subir archivos' }));
      return;
    }

    try {
      setUploadingFiles(prev => ({ ...prev, [field]: true }));
      setErrors(prev => ({ ...prev, [field]: '' }));

      console.log(`📤 Uploading ${field} for operation ${operationData.operation_number}`);
      
      const filePath = await uploadDocument(
        operationData.operation_number, 
        file, 
        field as 'id_card_front' | 'id_card_back' | 'salary_receipt'
      );
      
      // Update the documents info with the file path
      setDocumentsInfo(prev => ({
        ...prev,
        [field]: filePath
      }));

      console.log('✅ File uploaded successfully:', filePath);
    } catch (error) {
      console.error('❌ File upload error:', error);
      
      let errorMessage = 'Error al subir el archivo';
      if (error instanceof StorageError) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ ...prev, [field]: errorMessage }));
    } finally {
      setUploadingFiles(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleExportPDF = async () => {
    // Use the assessment prop first, then fallback to fetched assessment
    const assessmentData = assessment || fetchedAssessment;
    
    if (!assessmentData) {
      console.error('❌ No assessment data available for PDF export');
      setSubmitError('No hay datos de evaluación disponibles para exportar el PDF');
      return;
    }

    try {
      setExportingPDF(true);
      console.log('📄 Exporting digital file PDF...');
      
      await exportDigitalFile({
        assessment: assessmentData,
        operation: operationData || undefined
      });
      
      console.log('✅ PDF export completed');
    } catch (error) {
      console.error('❌ PDF export error:', error);
      setSubmitError('Error al generar el PDF. Inténtelo nuevamente.');
    } finally {
      setExportingPDF(false);
    }
  };

  const getStageIcon = (stage: Stage) => {
    switch (stage) {
      case 'contact_info':
        return <User className="w-5 h-5" />;
      case 'documents':
        return <FileText className="w-5 h-5" />;
      case 'veraz_data':
        return <BarChart3 className="w-5 h-5" />;
      case 'verification':
        return <CheckSquare className="w-5 h-5" />;
    }
  };

  const getStageTitle = (stage: Stage) => {
    switch (stage) {
      case 'contact_info':
        return 'Información de Contacto';
      case 'documents':
        return 'Documentos';
      case 'veraz_data':
        return 'Datos VERAZ';
      case 'verification':
        return 'Verificación Final';
    }
  };

  const renderProgressBar = () => {
    const stages: Stage[] = ['contact_info', 'documents', 'veraz_data', 'verification'];
    const currentIndex = stages.indexOf(currentStage);

    console.log('🎯 Rendering progress bar - current stage:', currentStage, 'index:', currentIndex);

    return (
      <div className="flex items-center justify-between mb-6">
        {stages.map((stage, index) => (
          <div key={stage} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                index <= currentIndex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              } ${!isReadOnly && index <= currentIndex ? 'cursor-pointer hover:bg-blue-700' : ''}`}
              onClick={() => {
                if (!isReadOnly && index <= currentIndex) {
                  setCurrentStage(stages[index]);
                }
              }}
            >
              {index < currentIndex ? '✓' : index + 1}
            </div>
            {index < stages.length - 1 && (
              <div className={`w-12 h-1 mx-2 transition-colors duration-200 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAssessmentSummary = () => {
    const assessmentData = assessment || fetchedAssessment;
    if (!assessmentData && !operationData?.assessment_id) return null;

    return (
      <Card className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Pre-evaluación BCRA</h3>
            <p className="text-sm text-gray-600">Cliente aprobado para continuar</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Estado BCRA</p>
            <p className="font-medium text-green-600">APTO</p>
          </div>
          <div>
            <p className="text-gray-500">Fecha Evaluación</p>
            <p className="font-medium">
              {assessmentData?.created_at 
                ? new Date(assessmentData.created_at).toLocaleDateString('es-AR')
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </Card>
    );
  };

  const renderOperationSummary = () => {
    if (!isReadOnly || !operationData) return null;

    return (
      <div className="space-y-6">
        {/* Operation Header */}
        <Card>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Operación Completada</h2>
            <p className="text-gray-600 mb-4">Todos los datos han sido recopilados exitosamente</p>
            <div className="flex flex-col items-center space-y-3">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 text-green-700 border border-green-200">
                <CheckSquare className="w-4 h-4 mr-2" />
                <span className="font-medium">COMPLETADA</span>
              </div>
              
              {/* Export PDF Button */}
              <Button
                onClick={handleExportPDF}
                loading={exportingPDF}
                disabled={exportingPDF}
                className="flex items-center space-x-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Legajo Digital</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Pre-evaluation Summary */}
        {renderAssessmentSummary()}

        {/* Contact Information Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Información de Contacto
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de Nacimiento:</span>
              <span className="font-medium">{contactInfo.date_of_birth || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-medium">{contactInfo.phone_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{contactInfo.email_address || 'N/A'}</span>
            </div>
          </div>
        </Card>

        {/* Documents Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Documentos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">DNI Frente:</span>
              <span className="font-medium">{documentsInfo.id_card_front ? '✓ Subido' : 'No subido'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DNI Dorso:</span>
              <span className="font-medium">{documentsInfo.id_card_back ? '✓ Subido' : 'No subido'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recibo de Sueldo:</span>
              <span className="font-medium">{documentsInfo.salary_receipt ? '✓ Subido' : 'No subido'}</span>
            </div>
            {documentsInfo.net_income && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos Netos:</span>
                <span className="font-medium">{formatAmount(documentsInfo.net_income)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* VERAZ Data Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Datos VERAZ
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Puntaje Crediticio</p>
              <p className="font-medium">{verazData.credit_score || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Estado Actual</p>
              <p className="font-medium">{verazData.current_status || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Máximo Atraso (24M)</p>
              <p className="font-medium">{verazData.maximum_delay_24m ? `${verazData.maximum_delay_24m} días` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Deuda Sistema Financiero</p>
              <p className="font-medium">{verazData.financial_system_debt_balance ? formatAmount(verazData.financial_system_debt_balance) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Ingresos VERAZ</p>
              <p className="font-medium">{verazData.veraz_report_income ? formatAmount(verazData.veraz_report_income) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Consultas (6M)</p>
              <p className="font-medium">{verazData.financial_inquiries_6m || 'N/A'}</p>
            </div>
            
            {/* Separador visual para los campos de solicitud */}
            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Datos de la Solicitud
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Monto Solicitado</p>
                  <p className="font-medium">{verazData.requested_amount ? formatAmount(verazData.requested_amount) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Monto de Cuota</p>
                  <p className="font-medium">{verazData.payment_amount ? formatAmount(verazData.payment_amount) : 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Relación Cuota/Ingreso</p>
                  <p className="font-medium">{verazData.payment_to_income_ratio ? `${(verazData.payment_to_income_ratio * 100).toFixed(1)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Verification Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" />
            Verificaciones
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Estado de Empleo:</span>
              <span className={`font-medium ${verificationData.employment_status_verified ? 'text-green-600' : 'text-red-600'}`}>
                {verificationData.employment_status_verified ? '✓ Verificado' : '✗ No verificado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Identidad:</span>
              <span className={`font-medium ${verificationData.identity_verified ? 'text-green-600' : 'text-red-600'}`}>
                {verificationData.identity_verified ? '✓ Verificado' : '✗ No verificado'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderContactInfoStage = () => (
    <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Información de Contacto</h2>
        <p className="text-gray-600">Complete los datos de contacto del cliente</p>
      </div>

      <div className="space-y-4">
        <Input
          type="date"
          label="Fecha de Nacimiento"
          value={contactInfo.date_of_birth || ''}
          onChange={(e) => !isReadOnly && setContactInfo(prev => ({ ...prev, date_of_birth: e.target.value }))}
          error={errors.date_of_birth}
          required
          disabled={isReadOnly}
        />

        <Input
          type="tel"
          label="Número de Teléfono"
          placeholder="+54 11 1234-5678"
          value={contactInfo.phone_number || ''}
          onChange={(e) => !isReadOnly && setContactInfo(prev => ({ ...prev, phone_number: e.target.value }))}
          error={errors.phone_number}
          required
          disabled={isReadOnly}
        />

        <Input
          type="email"
          label="Dirección de Email"
          placeholder="cliente@email.com"
          value={contactInfo.email_address || ''}
          onChange={(e) => !isReadOnly && setContactInfo(prev => ({ ...prev, email_address: e.target.value }))}
          error={errors.email_address}
          required
          disabled={isReadOnly}
        />
      </div>
    </Card>
  );

  const renderDocumentsStage = () => (
    <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Documentos</h2>
        <p className="text-gray-600">Suba los documentos requeridos</p>
        {operationData && (
          <p className="text-sm text-blue-600 mt-2">
            📁 Bucket: {operationData.operation_number}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DNI Frente <span className="text-red-500">*</span>
          </label>
          {isReadOnly ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                {documentsInfo.id_card_front ? `✓ Archivo: ${documentsInfo.id_card_front}` : 'No subido'}
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {uploadingFiles.id_card_front ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Subiendo...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'id_card_front');
                    }}
                    className="hidden"
                    id="id-front"
                    disabled={isReadOnly || uploadingFiles.id_card_front}
                  />
                  <label htmlFor="id-front" className="cursor-pointer text-blue-600 hover:text-blue-700">
                    {documentsInfo.id_card_front ? '✓ Archivo subido - Cambiar' : 'Seleccionar archivo'}
                  </label>
                </>
              )}
            </div>
          )}
          {errors.id_card_front && (
            <p className="text-sm text-red-600 mt-1">{errors.id_card_front}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DNI Dorso <span className="text-red-500">*</span>
          </label>
          {isReadOnly ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                {documentsInfo.id_card_back ? `✓ Archivo: ${documentsInfo.id_card_back}` : 'No subido'}
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {uploadingFiles.id_card_back ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Subiendo...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'id_card_back');
                    }}
                    className="hidden"
                    id="id-back"
                    disabled={isReadOnly || uploadingFiles.id_card_back}
                  />
                  <label htmlFor="id-back" className="cursor-pointer text-blue-600 hover:text-blue-700">
                    {documentsInfo.id_card_back ? '✓ Archivo subido - Cambiar' : 'Seleccionar archivo'}
                  </label>
                </>
              )}
            </div>
          )}
          {errors.id_card_back && (
            <p className="text-sm text-red-600 mt-1">{errors.id_card_back}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recibo de Sueldo (Opcional)
          </label>
          {isReadOnly ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                {documentsInfo.salary_receipt ? `✓ Archivo: ${documentsInfo.salary_receipt}` : 'No subido'}
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {uploadingFiles.salary_receipt ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Subiendo...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'salary_receipt');
                    }}
                    className="hidden"
                    id="salary-receipt"
                    disabled={isReadOnly || uploadingFiles.salary_receipt}
                  />
                  <label htmlFor="salary-receipt" className="cursor-pointer text-blue-600 hover:text-blue-700">
                    {documentsInfo.salary_receipt ? '✓ Archivo subido - Cambiar' : 'Seleccionar archivo'}
                  </label>
                </>
              )}
            </div>
          )}
          {errors.salary_receipt && (
            <p className="text-sm text-red-600 mt-1">{errors.salary_receipt}</p>
          )}
        </div>

        <Input
          type="number"
          label="Ingresos Netos (Opcional)"
          placeholder="0"
          value={documentsInfo.net_income || ''}
          onChange={(e) => !isReadOnly && setDocumentsInfo(prev => ({ ...prev, net_income: parseFloat(e.target.value) || undefined }))}
          disabled={isReadOnly}
        />
      </div>
    </Card>
  );

  const renderVerazDataStage = () => (
    <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
          <BarChart3 className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Datos VERAZ</h2>
        <p className="text-gray-600">Complete la información crediticia</p>
      </div>

      <div className="space-y-4">
        <Input
          type="number"
          label="Puntaje Crediticio"
          placeholder="0-999"
          value={verazData.credit_score || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, credit_score: parseInt(e.target.value) || undefined }))}
          error={errors.credit_score}
          required
          disabled={isReadOnly}
        />

        <Input
          type="text"
          label="Estado Actual"
          placeholder="Normal, Con seguimiento, etc."
          value={verazData.current_status || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, current_status: e.target.value }))}
          error={errors.current_status}
          required
          disabled={isReadOnly}
        />

        <Input
          type="number"
          label="Máximo Atraso (24M)"
          placeholder="Días"
          value={verazData.maximum_delay_24m || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, maximum_delay_24m: parseInt(e.target.value) || undefined }))}
          error={errors.maximum_delay_24m}
          required
          disabled={isReadOnly}
        />

        <Input
          type="number"
          label="Saldo Deuda Sistema Financiero"
          placeholder="0"
          value={verazData.financial_system_debt_balance || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, financial_system_debt_balance: parseFloat(e.target.value) || undefined }))}
          error={errors.financial_system_debt_balance}
          required
          disabled={isReadOnly}
        />

        <Input
          type="number"
          label="Ingresos Reporte VERAZ"
          placeholder="0"
          value={verazData.veraz_report_income || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, veraz_report_income: parseFloat(e.target.value) || undefined }))}
          error={errors.veraz_report_income}
          required
          disabled={isReadOnly}
        />

        <Input
          type="number"
          label="Consultas Financieras (Últimos 6M)"
          placeholder="0"
          value={verazData.financial_inquiries_6m || ''}
          onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, financial_inquiries_6m: parseInt(e.target.value) || undefined }))}
          error={errors.financial_inquiries_6m}
          required
          disabled={isReadOnly}
        />

        {/* Separador visual para los campos de solicitud */}
        <div className="border-t border-gray-200 pt-4 mt-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Datos de la Solicitud
          </h3>
          
          <div className="space-y-4">
            <Input
              type="number"
              label="Monto Solicitado"
              placeholder="0"
              value={verazData.requested_amount || ''}
              onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, requested_amount: parseFloat(e.target.value) || undefined }))}
              error={errors.requested_amount}
              required
              disabled={isReadOnly}
            />

            <Input
              type="number"
              label="Monto de Cuota"
              placeholder="0"
              value={verazData.payment_amount || ''}
              onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || undefined }))}
              error={errors.payment_amount}
              required
              disabled={isReadOnly}
            />

            <Input
              type="number"
              label="Relación Cuota/Ingreso"
              placeholder="0.00 - 1.00"
              step="0.01"
              value={verazData.payment_to_income_ratio || ''}
              onChange={(e) => !isReadOnly && setVerazData(prev => ({ ...prev, payment_to_income_ratio: parseFloat(e.target.value) || undefined }))}
              error={errors.payment_to_income_ratio}
              required
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>
    </Card>
  );

  const renderVerificationStage = () => (
    <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
          <CheckSquare className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Verificación Final</h2>
        <p className="text-gray-600">Confirme las verificaciones realizadas</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado de Empleo Verificado <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="employment_verified"
                value="true"
                checked={verificationData.employment_status_verified === true}
                onChange={() => !isReadOnly && setVerificationData(prev => ({ ...prev, employment_status_verified: true }))}
                className="mr-2"
                disabled={isReadOnly}
              />
              Sí, verificado
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="employment_verified"
                value="false"
                checked={verificationData.employment_status_verified === false}
                onChange={() => !isReadOnly && setVerificationData(prev => ({ ...prev, employment_status_verified: false }))}
                className="mr-2"
                disabled={isReadOnly}
              />
              No verificado
            </label>
          </div>
          {errors.employment_status_verified && (
            <p className="text-sm text-red-600 mt-1">{errors.employment_status_verified}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Identidad Verificada <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="identity_verified"
                value="true"
                checked={verificationData.identity_verified === true}
                onChange={() => !isReadOnly && setVerificationData(prev => ({ ...prev, identity_verified: true }))}
                className="mr-2"
                disabled={isReadOnly}
              />
              Sí, verificado
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="identity_verified"
                value="false"
                checked={verificationData.identity_verified === false}
                onChange={() => !isReadOnly && setVerificationData(prev => ({ ...prev, identity_verified: false }))}
                className="mr-2"
                disabled={isReadOnly}
              />
              No verificado
            </label>
          </div>
          {errors.identity_verified && (
            <p className="text-sm text-red-600 mt-1">{errors.identity_verified}</p>
          )}
        </div>
      </div>
    </Card>
  );

  const renderCurrentStage = () => {
    console.log('🎨 Rendering stage:', currentStage);
    
    // If in read-only mode, show the summary
    if (isReadOnly) {
      return renderOperationSummary();
    }
    
    switch (currentStage) {
      case 'contact_info':
        return renderContactInfoStage();
      case 'documents':
        return renderDocumentsStage();
      case 'veraz_data':
        return renderVerazDataStage();
      case 'verification':
        return renderVerificationStage();
      default:
        return renderContactInfoStage();
    }
  };

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
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">
            {isReadOnly ? 'Resumen de Operación' : 'Solicitud de Préstamo'}
          </h1>
          {operationData && (
            <p className="text-sm text-gray-600 font-mono">{operationData.operation_number}</p>
          )}
        </div>
        <div className="w-10"></div>
      </div>

      {/* Client Info */}
      {(assessment || operationData || fetchedAssessment) && (
        <Card padding="sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{(assessment?.client_name || operationData?.client_name || fetchedAssessment?.client_name) || 'Cliente'}</p>
              <p className="text-sm text-gray-600 font-mono">{assessment?.client_cuit || operationData?.client_cuit || fetchedAssessment?.client_cuit}</p>
            </div>
            {isReadOnly && (
              <div className="ml-auto">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  COMPLETADA
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Progress Bar - Only show if not in read-only mode */}
      {!isReadOnly && renderProgressBar()}

      {/* Submit Error */}
      {submitError && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Error al procesar</p>
              <p className="text-sm text-red-600 mt-1">{submitError}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Current Stage */}
      {renderCurrentStage()}

      {/* Navigation - Only show if not in read-only mode */}
      {!isReadOnly && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleNext}
            loading={loading}
            disabled={loading}
          >
            {currentStage === 'verification' ? 'Completar' : 'Siguiente'}
          </Button>
        </div>
      )}

      {/* Read-only mode navigation */}
      {isReadOnly && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al BackOffice</span>
          </Button>
        </div>
      )}
    </div>
  );
}