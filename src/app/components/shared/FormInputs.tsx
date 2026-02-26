"use client";

import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Input mejorado con label, error y helper text
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-700">
            {label}
            {props.required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full rounded-lg border px-3 py-2.5 text-sm transition-all
              ${icon ? "pl-10" : ""}
              ${error 
                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500" 
                : "border-stone-300 bg-white focus:border-blue-500 focus:ring-blue-500"
              }
              disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60
              ${className}
            `}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Select mejorado con label y error
 */
export function Select(props: {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="w-full">
      {props.label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-700">
          {props.label}
          {props.required && <span className="ml-1 text-red-600">*</span>}
        </label>
      )}
      
      <select
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm transition-all
          ${props.error 
            ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500" 
            : "border-stone-300 bg-white focus:border-blue-500 focus:ring-blue-500"
          }
          disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60
          ${props.className || ""}
        `}
      >
        {props.children}
      </select>

      {props.error && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {props.error}
        </p>
      )}

      {props.helperText && !props.error && (
        <p className="mt-1 text-xs text-stone-500">{props.helperText}</p>
      )}
    </div>
  );
}

/**
 * Textarea mejorado con label y error
 */
export const Textarea = forwardRef<HTMLTextAreaElement, {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-700">
            {label}
            {props.required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={`
            w-full rounded-lg border px-3 py-2.5 text-sm transition-all
            ${error 
              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500" 
              : "border-stone-300 bg-white focus:border-blue-500 focus:ring-blue-500"
            }
            disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60
            ${className}
          `}
          {...props}
        />

        {error && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
