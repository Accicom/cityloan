import React from 'react';
import { CheckCircle, XCircle, Clock, Award, AlertTriangle } from 'lucide-react';
import { Assessment } from '../types';
import { Card } from './Card';

interface AssessmentCardProps {
  assessment: Assessment;
  onClick?: () => void;
}

export function AssessmentCard({ assessment, onClick }: AssessmentCardProps) {
  const getStatusIcon = () => {
    // If BCRA status is available, use it for the icon
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return <Award className="w-5 h-5 text-green-600" />;
    } else if (assessment.bcra_eligibility_status === 'BCRA_NO_APTO') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    
    // Fall back to assessment result
    switch (assessment.assessment_result) {
      case 'eligible':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'not_eligible':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    // If BCRA status is available, use it for colors
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (assessment.bcra_eligibility_status === 'BCRA_NO_APTO') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    
    // Fall back to assessment result
    switch (assessment.assessment_result) {
      case 'eligible':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'not_eligible':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusText = () => {
    // If BCRA status is available, show it
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return 'BCRA APTO';
    } else if (assessment.bcra_eligibility_status === 'BCRA_NO_APTO') {
      return 'BCRA NO APTO';
    }
    
    // Fall back to assessment result
    switch (assessment.assessment_result) {
      case 'eligible':
        return 'Eligible';
      case 'not_eligible':
        return 'Not Eligible';
      default:
        return 'Pending';
    }
  };

  const getScoreDisplay = () => {
    // If BCRA APTO, show a checkmark instead of score
    if (assessment.bcra_eligibility_status === 'BCRA_APTO') {
      return (
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle size={14} />
          <span className="text-sm font-medium">APTO</span>
        </div>
      );
    }
    
    // If BCRA NO APTO, show an X instead of score
    if (assessment.bcra_eligibility_status === 'BCRA_NO_APTO') {
      return (
        <div className="flex items-center space-x-1 text-red-600">
          <XCircle size={14} />
          <span className="text-sm font-medium">NO APTO</span>
        </div>
      );
    }
    
    // For pending BCRA or traditional assessments, show pending status
    return (
      <div className="flex items-center space-x-1 text-amber-600">
        <AlertTriangle size={14} />
        <span className="text-sm font-medium">PENDIENTE</span>
      </div>
    );
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${onClick ? 'hover:bg-gray-50' : ''}`}
      onClick={onClick}
      padding="md"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        {getScoreDisplay()}
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-sm text-gray-500">CUIT</p>
          <p className="font-mono text-sm">{assessment.client_cuit}</p>
        </div>
        
        {assessment.client_name && (
          <div>
            <p className="text-sm text-gray-500">Client Name</p>
            <p className="font-medium">{assessment.client_name}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm text-gray-500">Assessed</p>
          <p className="text-sm">
            {new Date(assessment.created_at).toLocaleDateString('en-US', {
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
  );
}