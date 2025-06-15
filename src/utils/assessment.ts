import { BCRADebtData, BCRAHistoricalData, BCRAEligibilityAnalysis } from '../types';
import { fetchBCRADebtData, fetchBCRAHistoricalData, BCRAApiError, analyzeBCRAEligibility } from './bcraApi';

// Mock data for demonstration - in production, this would come from external APIs
const mockClientData: Record<string, any> = {
  '20123456781': {
    name: 'Juan Pérez',
  },
  '27987654321': {
    name: 'María González',
  },
  '23456789012': {
    name: 'Carlos Rodriguez',
  },
  '20987654321': {
    name: 'Ana Martínez',
  },
  '27123456789': {
    name: 'Luis García',
  },
};

// Cache for assessment results to improve performance
const assessmentCache = new Map<string, any>();

export async function performLoanAssessment(cuit: string): Promise<{
  result: 'eligible' | 'not_eligible' | 'pending';
  clientName?: string;
  bcraData?: BCRADebtData;
  bcraHistoricalData?: BCRAHistoricalData;
  bcraEligibilityStatus?: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
  bcraEligibilityAnalysis?: BCRAEligibilityAnalysis;
}> {
  const cleanCuit = cuit.replace(/\D/g, '');
  
  // Check cache first
  if (assessmentCache.has(cleanCuit)) {
    // Simulate shorter delay for cached results
    await new Promise(resolve => setTimeout(resolve, 300));
    return assessmentCache.get(cleanCuit);
  }
  
  console.log(`🔍 Starting loan assessment for CUIT: ${cleanCuit}`);
  
  // Simulate API call delay (reduced for better UX)
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const clientData = mockClientData[cleanCuit];
  let bcraData: BCRADebtData | undefined;
  let bcraHistoricalData: BCRAHistoricalData | undefined;
  let bcraEligibilityAnalysis: BCRAEligibilityAnalysis | undefined;
  let bcraEligibilityStatus: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING' = 'BCRA_PENDING';

  // Try to fetch BCRA current data
  try {
    console.log('📊 Fetching BCRA current debt data...');
    bcraData = await fetchBCRADebtData(cleanCuit);
    console.log(`✅ BCRA current data retrieved successfully for: ${bcraData.denominacion}`);
  } catch (error) {
    console.warn('⚠️ BCRA current data fetch failed:', error);
  }

  // Try to fetch BCRA historical data
  try {
    console.log('📈 Fetching BCRA historical data...');
    bcraHistoricalData = await fetchBCRAHistoricalData(cleanCuit);
    console.log(`✅ BCRA historical data retrieved successfully for: ${bcraHistoricalData.denominacion}`);
  } catch (error) {
    console.warn('⚠️ BCRA historical data fetch failed:', error);
  }

  // Analyze BCRA eligibility based on the new rules
  if (bcraData || bcraHistoricalData) {
    bcraEligibilityAnalysis = analyzeBCRAEligibility(bcraData || null, bcraHistoricalData || null);
    bcraEligibilityStatus = bcraEligibilityAnalysis.status;
  }

  // Determine result based on BCRA status
  let result: 'eligible' | 'not_eligible' | 'pending' = 'pending';
  
  if (bcraEligibilityStatus === 'BCRA_APTO') {
    result = 'eligible';
  } else if (bcraEligibilityStatus === 'BCRA_NO_APTO') {
    result = 'not_eligible';
  } else {
    result = 'pending';
  }
  
  // Use BCRA name if available, otherwise use mock data name
  const clientName = bcraData?.denominacion || bcraHistoricalData?.denominacion || clientData?.name;
  
  const assessmentResult = {
    result,
    clientName,
    bcraData,
    bcraHistoricalData,
    bcraEligibilityStatus,
    bcraEligibilityAnalysis,
  };
  
  // Cache the result
  assessmentCache.set(cleanCuit, assessmentResult);
  
  console.log(`✅ Assessment completed for ${clientName}: ${result} (BCRA: ${bcraEligibilityStatus})`);
  
  return assessmentResult;
}

// Clear cache periodically to ensure fresh data
setInterval(() => {
  assessmentCache.clear();
}, 5 * 60 * 1000); // Clear every 5 minutes