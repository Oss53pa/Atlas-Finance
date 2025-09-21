import React, { useState, useCallback } from 'react';
import { Button, LoadingSpinner } from '@/components/ui';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  disabled?: boolean;
  rows?: number; // For textarea
  min?: number; // For number inputs
  max?: number; // For number inputs
  step?: string; // For number inputs
}

export interface FormProps {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  className?: string;
  validate?: (data: Record<string, any>) => Record<string, string>;
}

const BaseForm: React.FC<FormProps> = ({
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  isLoading = false,
  className = '',
  validate
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `Le champ ${field.label} est requis`;
    }

    // Email validation
    if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      return 'Format d\'email invalide';
    }

    // Number validation
    if (field.type === 'number' && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return 'Veuillez saisir un nombre valide';
      }
      if (field.min !== undefined && numValue < field.min) {
        return `La valeur doit être supérieure ou égale à ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `La valeur doit être inférieure ou égale à ${field.max}`;
      }
    }

    // Custom validation
    if (field.validation) {
      return field.validation(value);
    }

    return null;
  }, []);

  const handleInputChange = (field: FormField, value: any) => {
    setFormData(prev => ({ ...prev, [field.name]: value }));
    
    // Clear error when user starts typing
    if (errors[field.name]) {
      setErrors(prev => ({ ...prev, [field.name]: '' }));
    }
  };

  const handleInputBlur = (field: FormField) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));
    
    const value = formData[field.name];
    const error = validateField(field, value);
    
    if (error) {
      setErrors(prev => ({ ...prev, [field.name]: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all fields
    fields.forEach(field => {
      const value = formData[field.name];
      const error = validateField(field, value);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    // Custom form-level validation
    if (validate) {
      const customErrors = validate(formData);
      Object.assign(newErrors, customErrors);
    }

    setErrors(newErrors);
    setTouched(fields.reduce((acc, field) => ({ ...acc, [field.name]: true }), {}));

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const hasError = touched[field.name] && error;

    const baseClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-tuatara focus:border-transparent ${
      hasError ? 'border-red-500' : 'border-gray-300'
    } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`;

    const fieldId = `field-${field.name}`;
    const errorId = `error-${field.name}`;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-tuatara">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={fieldId}
              rows={field.rows || 3}
              className={baseClasses}
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              onBlur={() => handleInputBlur(field)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              required={field.required}
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
            />
            {hasError && (
              <p id={errorId} className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-tuatara">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={fieldId}
              className={baseClasses}
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              onBlur={() => handleInputBlur(field)}
              disabled={field.disabled}
              required={field.required}
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
            >
              <option value="">-- Sélectionner --</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasError && (
              <p id={errorId} className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <input
              id={fieldId}
              type="checkbox"
              className="h-4 w-4 text-tuatara focus:ring-tuatara border-gray-300 rounded"
              checked={value || false}
              onChange={(e) => handleInputChange(field, e.target.checked)}
              onBlur={() => handleInputBlur(field)}
              disabled={field.disabled}
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
            />
            <label htmlFor={fieldId} className="text-sm font-medium text-tuatara">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {hasError && (
              <p id={errorId} className="text-sm text-red-600 ml-6" role="alert">
                {error}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-tuatara">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={fieldId}
              type={field.type}
              className={baseClasses}
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              onBlur={() => handleInputBlur(field)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.step}
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
            />
            {hasError && (
              <p id={errorId} className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="space-y-4">
        {fields.map(renderField)}
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          className="bg-tuatara hover:bg-rolling-stone text-swirl"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Enregistrement...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};

export default BaseForm;