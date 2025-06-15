import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ResultsPage } from './pages/ResultsPage';
import { BackOfficePage } from './pages/BackOfficePage';
import { LoanApplicationPage } from './pages/LoanApplicationPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Assessment, LoanOperation } from './types';

type AppView = 'dashboard' | 'assessment' | 'results' | 'backoffice' | 'loan-application';

function App() {
  const { user, loading, error } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentAssessment, setCurrentAssessment] = useState<Partial<Assessment> | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [currentLoanOperation, setCurrentLoanOperation] = useState<LoanOperation | null>(null);

  const handleNewAssessment = useCallback(() => {
    setCurrentAssessment(null);
    setSelectedAssessment(null);
    setCurrentView('assessment');
  }, []);

  const handleAssessmentComplete = useCallback((assessment: Partial<Assessment>) => {
    setCurrentAssessment(assessment);
    setSelectedAssessment(null);
    setCurrentView('results');
  }, []);

  const handleViewAssessment = useCallback((assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentAssessment(assessment);
    setCurrentView('results');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentAssessment(null);
    setSelectedAssessment(null);
    setCurrentLoanOperation(null);
    setCurrentView('dashboard');
  }, []);

  const handleBackToAssessment = useCallback(() => {
    setCurrentView('assessment');
  }, []);

  const handleGoToBackOffice = useCallback(() => {
    setCurrentView('backoffice');
  }, []);

  const handleStartLoanApplication = useCallback((assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentLoanOperation(null);
    setCurrentView('loan-application');
  }, []);

  const handleViewLoanOperation = useCallback((operation: LoanOperation) => {
    setCurrentLoanOperation(operation);
    setCurrentView('loan-application');
  }, []);

  const handleBackToBackOffice = useCallback(() => {
    setCurrentLoanOperation(null);
    setSelectedAssessment(null);
    setCurrentView('backoffice');
  }, []);

  // Show error state if there's a critical error
  if (error && error.includes('Missing Supabase')) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Supabase environment variables are missing. Please check your configuration.
          </p>
          <p className="text-sm text-gray-500">
            Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <LoginPage />
      </Router>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header onBackOfficeClick={handleGoToBackOffice} />
        
        <main className="pb-safe">
          {currentView === 'dashboard' && (
            <DashboardPage
              onNewAssessment={handleNewAssessment}
              onViewAssessment={handleViewAssessment}
            />
          )}
          
          {currentView === 'assessment' && (
            <AssessmentPage
              onBack={handleBackToDashboard}
              onComplete={handleAssessmentComplete}
            />
          )}
          
          {currentView === 'results' && currentAssessment && (
            <ResultsPage
              assessment={currentAssessment}
              onBack={selectedAssessment ? handleBackToDashboard : handleBackToAssessment}
              onDashboard={handleBackToDashboard}
            />
          )}

          {currentView === 'backoffice' && (
            <BackOfficePage
              onBack={handleBackToDashboard}
              onStartLoanApplication={handleStartLoanApplication}
              onViewLoanOperation={handleViewLoanOperation}
            />
          )}

          {currentView === 'loan-application' && (
            <LoanApplicationPage
              assessment={selectedAssessment}
              operation={currentLoanOperation}
              onBack={handleBackToBackOffice}
              onComplete={handleBackToBackOffice}
            />
          )}
        </main>
      </div>
    </Router>
  );
}

export default App;