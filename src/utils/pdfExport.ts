import { Assessment, LoanOperation, BCRADebtData, BCRAHistoricalData, BCRAEntity, BCRAHistoricalEntity } from '../types';
import { formatAmount, formatPeriod, getSituationDescription } from './bcraApi';
import { getDocumentUrl } from './storage';

export interface PDFExportData {
  assessment: Assessment;
  operation?: LoanOperation;
}

async function getDocumentImages(operation?: LoanOperation): Promise<{
  idCardFront?: string;
  idCardBack?: string;
  salaryReceipt?: string;
}> {
  if (!operation?.documents) return {};

  const images: { idCardFront?: string; idCardBack?: string; salaryReceipt?: string } = {};

  try {
    // Get document URLs if they exist
    if (operation.documents.id_card_front) {
      try {
        images.idCardFront = await getDocumentUrl(operation.documents.id_card_front);
      } catch (error) {
        console.warn('Could not load ID card front image:', error);
      }
    }

    if (operation.documents.id_card_back) {
      try {
        images.idCardBack = await getDocumentUrl(operation.documents.id_card_back);
      } catch (error) {
        console.warn('Could not load ID card back image:', error);
      }
    }

    if (operation.documents.salary_receipt) {
      try {
        images.salaryReceipt = await getDocumentUrl(operation.documents.salary_receipt);
      } catch (error) {
        console.warn('Could not load salary receipt image:', error);
      }
    }
  } catch (error) {
    console.error('Error loading document images:', error);
  }

  return images;
}

export async function generateDigitalFileHTML(data: PDFExportData): Promise<string> {
  const { assessment, operation } = data;
  
  // Load document images
  const documentImages = await getDocumentImages(operation);
  
  const currentDate = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const assessmentDate = new Date(assessment.created_at).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate BCRA current data section
  const renderBCRACurrentData = () => {
    if (!assessment.bcra_debt_data) return '';

    const bcraData = assessment.bcra_debt_data as BCRADebtData;
    const latestPeriod = bcraData.periodos?.[0];

    let entitiesHTML = '';
    if (latestPeriod?.entidades && latestPeriod.entidades.length > 0) {
      entitiesHTML = `
        <h4 style="color: #374151; margin: 16px 0 8px 0; font-size: 14px;">Entidades Financieras</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px;">Entidad</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 12px;">Situación</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-size: 12px;">Monto</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 12px;">Días Atraso</th>
            </tr>
          </thead>
          <tbody>
            ${latestPeriod.entidades.map((entity: BCRAEntity) => `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; font-size: 11px;">${entity.entidad}</td>
                <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 11px;">
                  <span style="background-color: ${entity.situacion === 1 ? '#dcfce7' : entity.situacion === 2 ? '#dbeafe' : '#fef3c7'}; 
                               color: ${entity.situacion === 1 ? '#166534' : entity.situacion === 2 ? '#1e40af' : '#92400e'}; 
                               padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                    ${entity.situacion} - ${getSituationDescription(entity.situacion)}
                  </span>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-size: 11px; font-weight: 600;">
                  ${formatAmount(entity.monto)}
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 11px; ${entity.diasAtrasoPago > 0 ? 'color: #dc2626; font-weight: 600;' : ''}">
                  ${entity.diasAtrasoPago}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center;">
          🏦 Situación Crediticia Actual - BCRA
        </h3>
        <div style="margin-bottom: 12px;">
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td style="color: #6b7280; padding: 4px 0; width: 30%;">Cliente:</td>
              <td style="font-weight: 600; padding: 4px 0;">${bcraData.denominacion}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">CUIT:</td>
              <td style="font-family: monospace; padding: 4px 0;">${bcraData.identificacion}</td>
            </tr>
            ${latestPeriod ? `
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Último Reporte:</td>
              <td style="font-weight: 600; padding: 4px 0;">${formatPeriod(latestPeriod.periodo)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ${entitiesHTML}
      </div>
    `;
  };

  // Generate BCRA historical data section
  const renderBCRAHistoricalData = () => {
    if (!assessment.bcra_historical_data) return '';

    const historicalData = assessment.bcra_historical_data as BCRAHistoricalData;
    const last12Months = historicalData.periodos.slice(0, 12);

    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          📈 Historial Crediticio - Últimos 12 Meses
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px;">Período</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 12px;">Peor Situación</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-size: 12px;">Deuda Total</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 12px;">Entidades</th>
            </tr>
          </thead>
          <tbody>
            ${last12Months.map(periodo => {
              const worstSituation = Math.max(...periodo.entidades.map((e: BCRAHistoricalEntity) => e.situacion));
              const totalDebt = periodo.entidades.reduce((sum: number, e: BCRAHistoricalEntity) => sum + e.monto, 0);
              
              return `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; font-size: 11px; font-weight: 600;">
                    ${formatPeriod(periodo.periodo)}
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 11px;">
                    <span style="background-color: ${worstSituation === 1 ? '#dcfce7' : worstSituation === 2 ? '#dbeafe' : '#fef3c7'}; 
                                 color: ${worstSituation === 1 ? '#166534' : worstSituation === 2 ? '#1e40af' : '#92400e'}; 
                                 padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                      ${worstSituation}
                    </span>
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-size: 11px; font-weight: 600;">
                    ${formatAmount(totalDebt)}
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-size: 11px;">
                    ${periodo.entidades.length}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // Generate operation summary if available
  const renderOperationSummary = () => {
    if (!operation) return '';

    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f8fafc;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          📋 Resumen de Operación
        </h3>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="color: #6b7280; padding: 4px 0; width: 30%;">Número de Operación:</td>
            <td style="font-family: monospace; font-weight: 600; padding: 4px 0;">${operation.operation_number}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Estado:</td>
            <td style="padding: 4px 0;">
              <span style="background-color: ${operation.status === 'completed' ? '#dcfce7' : '#dbeafe'}; 
                           color: ${operation.status === 'completed' ? '#166534' : '#1e40af'}; 
                           padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${operation.status === 'completed' ? 'COMPLETADA' : operation.status.toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Fecha de Creación:</td>
            <td style="padding: 4px 0;">${new Date(operation.created_at).toLocaleDateString('es-AR')}</td>
          </tr>
          ${operation.status === 'completed' ? `
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Fecha de Finalización:</td>
            <td style="padding: 4px 0;">${new Date(operation.updated_at).toLocaleDateString('es-AR')}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  };

  // Generate contact information section
  const renderContactInfo = () => {
    if (!operation?.contact_info) return '';

    const contact = operation.contact_info;
    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          👤 Información de Contacto
        </h3>
        <table style="width: 100%; font-size: 12px;">
          ${contact.date_of_birth ? `
          <tr>
            <td style="color: #6b7280; padding: 4px 0; width: 30%;">Fecha de Nacimiento:</td>
            <td style="padding: 4px 0;">${new Date(contact.date_of_birth).toLocaleDateString('es-AR')}</td>
          </tr>
          ` : ''}
          ${contact.phone_number ? `
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Teléfono:</td>
            <td style="padding: 4px 0;">${contact.phone_number}</td>
          </tr>
          ` : ''}
          ${contact.email_address ? `
          <tr>
            <td style="color: #6b7280; padding: 4px 0;">Email:</td>
            <td style="padding: 4px 0;">${contact.email_address}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  };

  // Generate documents section with images
  const renderDocuments = () => {
    if (!operation?.documents) return '';

    const docs = operation.documents;
    
    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          📄 Documentos Adjuntos
        </h3>
        
        <div style="margin-bottom: 16px;">
          <table style="width: 100%; font-size: 12px; margin-bottom: 16px;">
            <tr>
              <td style="color: #6b7280; padding: 4px 0; width: 30%;">DNI Frente:</td>
              <td style="padding: 4px 0;">${docs.id_card_front ? '✅ Adjunto' : '❌ No adjunto'}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">DNI Dorso:</td>
              <td style="padding: 4px 0;">${docs.id_card_back ? '✅ Adjunto' : '❌ No adjunto'}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Recibo de Sueldo:</td>
              <td style="padding: 4px 0;">${docs.salary_receipt ? '✅ Adjunto' : '❌ No adjunto'}</td>
            </tr>
            ${docs.net_income ? `
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Ingresos Netos:</td>
              <td style="padding: 4px 0; font-weight: 600;">${formatAmount(docs.net_income)}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${(documentImages.idCardFront || documentImages.idCardBack) ? `
        <div style="margin-top: 20px;">
          <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 14px;">Imágenes del Documento Nacional de Identidad</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            ${documentImages.idCardFront ? `
            <div style="text-align: center;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">DNI - Frente</h5>
              <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 8px; background-color: #f9fafb;">
                <img src="${documentImages.idCardFront}" 
                     alt="DNI Frente" 
                     style="max-width: 100%; max-height: 200px; width: auto; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
              </div>
            </div>
            ` : `
            <div style="text-align: center;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">DNI - Frente</h5>
              <div style="border: 2px dashed #d1d5db; border-radius: 8px; padding: 32px; background-color: #f9fafb; color: #9ca3af;">
                <p style="margin: 0; font-size: 12px;">Imagen no disponible</p>
              </div>
            </div>
            `}
            
            ${documentImages.idCardBack ? `
            <div style="text-align: center;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">DNI - Dorso</h5>
              <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 8px; background-color: #f9fafb;">
                <img src="${documentImages.idCardBack}" 
                     alt="DNI Dorso" 
                     style="max-width: 100%; max-height: 200px; width: auto; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
              </div>
            </div>
            ` : `
            <div style="text-align: center;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">DNI - Dorso</h5>
              <div style="border: 2px dashed #d1d5db; border-radius: 8px; padding: 32px; background-color: #f9fafb; color: #9ca3af;">
                <p style="margin: 0; font-size: 12px;">Imagen no disponible</p>
              </div>
            </div>
            `}
          </div>
        </div>
        ` : ''}

        ${documentImages.salaryReceipt ? `
        <div style="margin-top: 20px; page-break-inside: avoid;">
          <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 14px;">Recibo de Sueldo</h4>
          <div style="text-align: center;">
            <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 8px; background-color: #f9fafb; display: inline-block;">
              <img src="${documentImages.salaryReceipt}" 
                   alt="Recibo de Sueldo" 
                   style="max-width: 100%; max-height: 300px; width: auto; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Generate VERAZ data section
  const renderVerazData = () => {
    if (!operation?.veraz_data) return '';

    const veraz = operation.veraz_data;
    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          📊 Datos VERAZ
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          ${veraz.credit_score ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Puntaje Crediticio</div>
            <div style="font-weight: 600; font-size: 14px;">${veraz.credit_score}</div>
          </div>
          ` : ''}
          ${veraz.current_status ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Estado Actual</div>
            <div style="font-weight: 600; font-size: 14px;">${veraz.current_status}</div>
          </div>
          ` : ''}
          ${veraz.maximum_delay_24m !== undefined ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Máximo Atraso (24M)</div>
            <div style="font-weight: 600; font-size: 14px;">${veraz.maximum_delay_24m} días</div>
          </div>
          ` : ''}
          ${veraz.financial_system_debt_balance !== undefined ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Deuda Sistema Financiero</div>
            <div style="font-weight: 600; font-size: 14px;">${formatAmount(veraz.financial_system_debt_balance)}</div>
          </div>
          ` : ''}
          ${veraz.veraz_report_income !== undefined ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Ingresos VERAZ</div>
            <div style="font-weight: 600; font-size: 14px;">${formatAmount(veraz.veraz_report_income)}</div>
          </div>
          ` : ''}
          ${veraz.financial_inquiries_6m !== undefined ? `
          <div style="padding: 8px 0;">
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Consultas (6M)</div>
            <div style="font-weight: 600; font-size: 14px;">${veraz.financial_inquiries_6m}</div>
          </div>
          ` : ''}
        </div>
        
        <!-- Separador visual para los campos de solicitud -->
        <div style="border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
          <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center;">
            💰 Datos de la Solicitud
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${veraz.requested_amount !== undefined ? `
            <div style="padding: 8px 0;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Monto Solicitado</div>
              <div style="font-weight: 600; font-size: 14px; color: #059669;">${formatAmount(veraz.requested_amount)}</div>
            </div>
            ` : ''}
            ${veraz.payment_amount !== undefined ? `
            <div style="padding: 8px 0;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Monto de Cuota</div>
              <div style="font-weight: 600; font-size: 14px; color: #059669;">${formatAmount(veraz.payment_amount)}</div>
            </div>
            ` : ''}
            ${veraz.payment_to_income_ratio !== undefined ? `
            <div style="padding: 8px 0; grid-column: span 2;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 2px;">Relación Cuota/Ingreso</div>
              <div style="font-weight: 600; font-size: 14px; color: #059669;">${(veraz.payment_to_income_ratio * 100).toFixed(1)}%</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  };

  // Generate verification section
  const renderVerification = () => {
    if (!operation?.verification_data) return '';

    const verification = operation.verification_data;
    return `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">
          ✅ Verificaciones
        </h3>
        <table style="width: 100%; font-size: 12px;">
          ${verification.employment_status_verified !== undefined ? `
          <tr>
            <td style="color: #6b7280; padding: 8px 0; width: 50%;">Estado de Empleo:</td>
            <td style="padding: 8px 0;">
              <span style="color: ${verification.employment_status_verified ? '#166534' : '#dc2626'}; font-weight: 600;">
                ${verification.employment_status_verified ? '✅ Verificado' : '❌ No verificado'}
              </span>
            </td>
          </tr>
          ` : ''}
          ${verification.identity_verified !== undefined ? `
          <tr>
            <td style="color: #6b7280; padding: 8px 0;">Identidad:</td>
            <td style="padding: 8px 0;">
              <span style="color: ${verification.identity_verified ? '#166534' : '#dc2626'}; font-weight: 600;">
                ${verification.identity_verified ? '✅ Verificado' : '❌ No verificado'}
              </span>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Legajo Digital - ${assessment.client_name || assessment.client_cuit}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin: 10px 0;
        }
        .subtitle {
          font-size: 16px;
          color: #6b7280;
        }
        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin: 10px 0;
        }
        .status-approved {
          background-color: #dcfce7;
          color: #166534;
          border: 2px solid #22c55e;
        }
        .status-rejected {
          background-color: #fef2f2;
          color: #dc2626;
          border: 2px solid #ef4444;
        }
        .section {
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .info-item {
          padding: 8px 0;
        }
        .info-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          font-size: 14px;
          color: #1f2937;
          margin-top: 2px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .header { page-break-inside: avoid; }
          .section { page-break-inside: avoid; margin-bottom: 20px; }
          img { max-width: 100% !important; height: auto !important; }
        }
        @page {
          margin: 1cm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏦 Portal de Evaluación de Préstamos</div>
        <h1 class="title">Legajo Digital</h1>
        <p class="subtitle">Pre-evaluación Crediticia BCRA</p>
        <div class="status-badge ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? 'status-approved' : 'status-rejected'}">
          ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '✅ CLIENTE APTO BCRA' : '❌ CLIENTE NO APTO BCRA'}
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">📋 Información del Cliente</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">CUIT</div>
            <div class="info-value" style="font-family: monospace; font-weight: 600;">${assessment.client_cuit}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Nombre/Razón Social</div>
            <div class="info-value">${assessment.client_name || 'No especificado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Fecha de Evaluación</div>
            <div class="info-value">${assessmentDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Estado BCRA</div>
            <div class="info-value">
              <span style="background-color: ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '#dcfce7' : '#fef2f2'}; 
                           color: ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '#166534' : '#dc2626'}; 
                           padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${assessment.bcra_eligibility_status?.replace('_', ' ') || 'PENDIENTE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      ${renderOperationSummary()}
      ${renderContactInfo()}
      ${renderDocuments()}
      ${renderVerazData()}
      ${renderVerification()}

      <div class="section">
        <h2 class="section-title">🎯 Criterios de Elegibilidad BCRA</h2>
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">
          El sistema evalúa automáticamente los siguientes criterios basados en la normativa del Banco Central:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px;">Criterio</th>
              <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 14px;">Requisito</th>
              <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 14px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 12px; font-size: 13px;">Situación crediticia actual</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">≤ 1</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">
                <span style="color: ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '#166534' : '#dc2626'};">
                  ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '✅ Cumple' : '❌ No cumple'}
                </span>
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 12px; font-size: 13px;">Últimos 6 meses</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">≤ 1</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">
                <span style="color: ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '#166534' : '#dc2626'};">
                  ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '✅ Cumple' : '❌ No cumple'}
                </span>
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 12px; font-size: 13px;">Últimos 12 meses</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">≤ 2</td>
              <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">
                <span style="color: ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '#166534' : '#dc2626'};">
                  ${assessment.bcra_eligibility_status === 'BCRA_APTO' ? '✅ Cumple' : '❌ No cumple'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      ${renderBCRACurrentData()}
      ${renderBCRAHistoricalData()}

      <div class="footer">
        <p><strong>Documento generado automáticamente</strong></p>
        <p>Fecha de generación: ${currentDate}</p>
        <p>Sistema de Evaluación Crediticia - Portal de Evaluación de Préstamos</p>
        <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
          Este documento contiene información confidencial y está destinado únicamente para uso interno.
          Los datos BCRA son obtenidos de la Central de Deudores del Sistema Financiero.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function downloadPDF(htmlContent: string, filename: string): void {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Por favor, permita las ventanas emergentes para generar el PDF');
    return;
  }

  // Write the HTML content to the new window
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      
      // Close the window after printing (optional)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 1000); // Increased timeout to allow images to load
  };
}

export async function exportDigitalFile(data: PDFExportData): Promise<void> {
  try {
    console.log('📄 Generating digital file PDF with images...');
    
    const htmlContent = await generateDigitalFileHTML(data);
    const filename = `legajo_digital_${data.assessment.client_cuit}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    downloadPDF(htmlContent, filename);
    
    console.log('✅ PDF export with images initiated');
  } catch (error) {
    console.error('❌ Error exporting PDF:', error);
    throw new Error('Failed to export digital file');
  }
}