import React from 'react';
import { CheckCircle, Clock, AlertCircle, Circle, Play } from 'lucide-react';
import { ClosureStep, ClosureStepStatus } from '../types/periodic-closures.types';
import { Button } from '@/shared/components/ui/Button';

interface StepsTimelineProps {
  steps: ClosureStep[];
  onExecuteStep?: (step: ClosureStep) => void;
}

export const StepsTimeline: React.FC<StepsTimelineProps> = ({
  steps,
  onExecuteStep
}) => {
  const getStatusIcon = (status: ClosureStepStatus) => {
    const icons = {
      'pending': <Circle className="w-5 h-5 text-[var(--color-text-secondary)]" />,
      'in_progress': <Clock className="w-5 h-5 text-[var(--color-primary)] animate-spin" />,
      'completed': <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />,
      'error': <AlertCircle className="w-5 h-5 text-[var(--color-error)]" />,
      'requires_approval': <AlertCircle className="w-5 h-5 text-orange-500" />
    };
    return icons[status];
  };

  const getStatusColor = (status: ClosureStepStatus) => {
    const colors = {
      'pending': 'border-[var(--color-border-dark)] bg-[var(--color-background-secondary)]',
      'in_progress': 'border-blue-400 bg-[var(--color-primary-lightest)]',
      'completed': 'border-green-400 bg-[var(--color-success-lightest)]',
      'error': 'border-red-400 bg-[var(--color-error-lightest)]',
      'requires_approval': 'border-orange-400 bg-orange-50'
    };
    return colors[status];
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${getStatusColor(step.status)}`}
        >
          {index < steps.length - 1 && (
            <div className="absolute left-6 top-14 bottom-[-16px] w-0.5 bg-[#D9D9D9]" />
          )}

          <div className="flex-shrink-0 mt-1">
            {getStatusIcon(step.status)}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-[#191919]">{step.name}</h4>
                  {step.mandatory && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] rounded">
                      Obligatoire
                    </span>
                  )}
                  {step.syscohada_compliance && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] rounded">
                      SYSCOHADA
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#767676] mt-1">{step.description}</p>

                <div className="flex items-center gap-4 mt-2 text-xs text-[#767676]">
                  {step.estimated_duration && (
                    <span>⏱️ {step.estimated_duration}</span>
                  )}
                  {step.created_entries !== undefined && step.created_entries > 0 && (
                    <span>📝 {step.created_entries} écritures</span>
                  )}
                  {step.syscohada_reference && (
                    <span>📖 Réf: {step.syscohada_reference}</span>
                  )}
                </div>

                {step.validated_by && (
                  <div className="text-xs text-[var(--color-success)] mt-2">
                    ✓ Validé par {step.validated_by}
                  </div>
                )}

                {step.errorMessage && (
                  <div className="text-xs text-[var(--color-error)] mt-2 bg-[var(--color-error-lightest)] p-2 rounded">
                    ⚠️ {step.errorMessage}
                  </div>
                )}
              </div>

              {step.status === 'pending' && onExecuteStep && (
                <Button
                  size="sm"
                  icon={Play}
                  onClick={() => onExecuteStep(step)}
                >
                  Exécuter
                </Button>
              )}
            </div>

            {step.controls && step.controls.length > 0 && (
              <div className="mt-3 space-y-1">
                {step.controls.map((control) => (
                  <div
                    key={control.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {control.status === 'passed' && (
                      <CheckCircle className="w-3 h-3 text-[var(--color-success)]" />
                    )}
                    {control.status === 'failed' && (
                      <AlertCircle className="w-3 h-3 text-[var(--color-error)]" />
                    )}
                    {control.status === 'pending' && (
                      <Circle className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    )}
                    <span className={
                      control.status === 'passed' ? 'text-[var(--color-success-dark)]' :
                      control.status === 'failed' ? 'text-[var(--color-error-dark)]' :
                      'text-[var(--color-text-primary)]'
                    }>
                      {control.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};