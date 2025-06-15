import { BCRAApiResponse, BCRADebtData, BCRAError, BCRAHistoricalApiResponse, BCRAHistoricalData, BCRAEligibilityAnalysis } from '../types';

const BCRA_API_BASE_URL = 'https://api.bcra.gob.ar/CentralDeDeudores/v1.0';

export class BCRAApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorMessages: string[] = []
  ) {
    super(message);
    this.name = 'BCRAApiError';
  }
}

export async function fetchBCRADebtData(cuit: string): Promise<BCRADebtData> {
  // Clean CUIT - remove any formatting
  const cleanCuit = cuit.replace(/\D/g, '');
  
  if (cleanCuit.length !== 11) {
    throw new BCRAApiError('CUIT must have exactly 11 digits', 400, ['Parámetro erróneo: Ingresar 11 dígitos para realizar la consulta.']);
  }

  const url = `${BCRA_API_BASE_URL}/Deudas/${cleanCuit}`;
  
  try {
    console.log(`🏦 Fetching BCRA debt data for CUIT: ${cleanCuit}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data: BCRAApiResponse = await response.json();
    
    console.log(`📊 BCRA API Response Status: ${data.status}`);

    // Handle different response statuses
    switch (data.status) {
      case 200:
        if (data.results) {
          console.log(`✅ BCRA data found for: ${data.results.denominacion}`);
          return data.results;
        } else {
          throw new BCRAApiError('No results in successful response', 200);
        }
        
      case 400:
        throw new BCRAApiError(
          'Invalid CUIT format', 
          400, 
          data.errorMessages || ['Parámetro erróneo: Ingresar 11 dígitos para realizar la consulta.']
        );
        
      case 404:
        throw new BCRAApiError(
          'No data found for the provided CUIT', 
          404, 
          data.errorMessages || ['No se encontró datos para la identificación ingresada.']
        );
        
      case 500:
        throw new BCRAApiError(
          'BCRA server error', 
          500, 
          data.errorMessages || ['Se produjo un error al ejecutar la acción.']
        );
        
      default:
        throw new BCRAApiError(
          `Unexpected response status: ${data.status}`, 
          data.status, 
          data.errorMessages || []
        );
    }
  } catch (error) {
    if (error instanceof BCRAApiError) {
      throw error;
    }
    
    // Handle network errors or other fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new BCRAApiError(
        'Network error: Unable to connect to BCRA API', 
        0, 
        ['Error de conexión con la API del BCRA. Verifique su conexión a internet.']
      );
    }
    
    console.error('❌ Unexpected error fetching BCRA data:', error);
    throw new BCRAApiError(
      'Unexpected error occurred', 
      0, 
      ['Error inesperado al consultar la API del BCRA.']
    );
  }
}

export async function fetchBCRAHistoricalData(cuit: string): Promise<BCRAHistoricalData> {
  // Clean CUIT - remove any formatting
  const cleanCuit = cuit.replace(/\D/g, '');
  
  if (cleanCuit.length !== 11) {
    throw new BCRAApiError('CUIT must have exactly 11 digits', 400, ['Parámetro erróneo: Ingresar 11 dígitos para realizar la consulta.']);
  }

  const url = `${BCRA_API_BASE_URL}/Deudas/Historicas/${cleanCuit}`;
  
  try {
    console.log(`📈 Fetching BCRA historical data for CUIT: ${cleanCuit}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data: BCRAHistoricalApiResponse = await response.json();
    
    console.log(`📊 BCRA Historical API Response Status: ${data.status}`);

    // Handle different response statuses
    switch (data.status) {
      case 200:
        if (data.results) {
          console.log(`✅ BCRA historical data found for: ${data.results.denominacion}`);
          return data.results;
        } else {
          throw new BCRAApiError('No results in successful response', 200);
        }
        
      case 400:
        throw new BCRAApiError(
          'Invalid CUIT format', 
          400, 
          data.errorMessages || ['Parámetro erróneo: Ingresar 11 dígitos para realizar la consulta.']
        );
        
      case 404:
        throw new BCRAApiError(
          'No historical data found for the provided CUIT', 
          404, 
          data.errorMessages || ['No se encontró datos para la identificación ingresada.']
        );
        
      case 500:
        throw new BCRAApiError(
          'BCRA server error', 
          500, 
          data.errorMessages || ['Se produjo un error al ejecutar la acción.']
        );
        
      default:
        throw new BCRAApiError(
          `Unexpected response status: ${data.status}`, 
          data.status, 
          data.errorMessages || []
        );
    }
  } catch (error) {
    if (error instanceof BCRAApiError) {
      throw error;
    }
    
    // Handle network errors or other fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new BCRAApiError(
        'Network error: Unable to connect to BCRA API', 
        0, 
        ['Error de conexión con la API del BCRA. Verifique su conexión a internet.']
      );
    }
    
    console.error('❌ Unexpected error fetching BCRA historical data:', error);
    throw new BCRAApiError(
      'Unexpected error occurred', 
      0, 
      ['Error inesperado al consultar la API del BCRA.']
    );
  }
}

export function analyzeBCRAEligibility(
  currentData: BCRADebtData | null,
  historicalData: BCRAHistoricalData | null
): BCRAEligibilityAnalysis {
  const analysis: BCRAEligibilityAnalysis = {
    isEligible: false,
    status: 'BCRA_PENDING',
    currentSituation: null,
    last6MonthsWorstSituation: null,
    last12MonthsWorstSituation: null,
    failureReasons: [],
    analysisDate: new Date().toISOString(),
  };

  // If no data available, consider as pending
  if (!currentData && !historicalData) {
    analysis.failureReasons.push('No hay datos disponibles en BCRA');
    return analysis;
  }

  // If only current data available, we can't do full historical analysis
  if (!historicalData) {
    analysis.failureReasons.push('No hay datos históricos disponibles para análisis completo');
    return analysis;
  }

  // Sort periods by date (most recent first)
  const sortedPeriods = [...historicalData.periodos].sort((a, b) => b.periodo.localeCompare(a.periodo));
  
  if (sortedPeriods.length === 0) {
    analysis.failureReasons.push('No hay períodos disponibles en el historial');
    return analysis;
  }

  // Get current date for period calculations
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentPeriod = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

  // Helper function to get worst situation for a period
  const getWorstSituationForPeriod = (periodo: any) => {
    if (!periodo.entidades || periodo.entidades.length === 0) return 1; // No entities = normal situation
    return Math.max(...periodo.entidades.map((e: any) => e.situacion));
  };

  // Helper function to check if period is within months from current
  const isPeriodWithinMonths = (periodo: string, months: number) => {
    const periodoYear = parseInt(periodo.substring(0, 4));
    const periodoMonth = parseInt(periodo.substring(4, 6));
    
    const periodoDate = new Date(periodoYear, periodoMonth - 1); // JavaScript months are 0-indexed
    const cutoffDate = new Date(currentYear, currentMonth - 1 - months);
    
    return periodoDate >= cutoffDate;
  };

  // 1. Check current situation (most recent period)
  const mostRecentPeriod = sortedPeriods[0];
  analysis.currentSituation = getWorstSituationForPeriod(mostRecentPeriod);
  
  if (analysis.currentSituation > 1) {
    analysis.failureReasons.push(`Situación actual: ${analysis.currentSituation} (debe ser ≤ 1)`);
  }

  // 2. Check last 6 months
  const last6MonthsPeriods = sortedPeriods.filter(p => isPeriodWithinMonths(p.periodo, 6));
  if (last6MonthsPeriods.length > 0) {
    analysis.last6MonthsWorstSituation = Math.max(...last6MonthsPeriods.map(getWorstSituationForPeriod));
    
    if (analysis.last6MonthsWorstSituation > 1) {
      analysis.failureReasons.push(`Peor situación últimos 6 meses: ${analysis.last6MonthsWorstSituation} (debe ser ≤ 1)`);
    }
  }

  // 3. Check last 12 months
  const last12MonthsPeriods = sortedPeriods.filter(p => isPeriodWithinMonths(p.periodo, 12));
  if (last12MonthsPeriods.length > 0) {
    analysis.last12MonthsWorstSituation = Math.max(...last12MonthsPeriods.map(getWorstSituationForPeriod));
    
    if (analysis.last12MonthsWorstSituation > 2) {
      analysis.failureReasons.push(`Peor situación últimos 12 meses: ${analysis.last12MonthsWorstSituation} (debe ser ≤ 2)`);
    }
  }

  // Determine final eligibility
  analysis.isEligible = analysis.failureReasons.length === 0;
  analysis.status = analysis.isEligible ? 'BCRA_APTO' : 'BCRA_NO_APTO';

  console.log(`🔍 BCRA Eligibility Analysis:`, {
    isEligible: analysis.isEligible,
    status: analysis.status,
    currentSituation: analysis.currentSituation,
    last6Months: analysis.last6MonthsWorstSituation,
    last12Months: analysis.last12MonthsWorstSituation,
    failureReasons: analysis.failureReasons,
  });

  return analysis;
}

export function getSituationDescription(situacion: number): string {
  switch (situacion) {
    case 1:
      return 'Situación Normal';
    case 2:
      return 'Con Seguimiento Especial / Riesgo Bajo';
    case 3:
      return 'Con Problemas / Riesgo Medio';
    case 4:
      return 'Con Alto Riesgo de Insolvencia / Riesgo Alto';
    case 5:
      return 'Irrecuperable';
    default:
      return `Situación ${situacion}`;
  }
}

export function getSituationColor(situacion: number): string {
  switch (situacion) {
    case 1:
      return 'text-green-700 bg-green-50 border-green-200';
    case 2:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 3:
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 4:
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 5:
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function formatPeriod(periodo: string): string {
  if (periodo.length !== 6) return periodo;
  
  const year = periodo.substring(0, 4);
  const month = periodo.substring(4, 6);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[monthIndex] || month;
  
  return `${monthName} ${year}`;
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount * 1000); // API returns amounts in thousands
}