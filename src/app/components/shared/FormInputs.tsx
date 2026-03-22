"use client";

import { forwardRef } from "react";
import { FormControl, FormHelperText, InputLabel, NativeSelect, TextField } from "@mui/material";

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
      <TextField
        fullWidth
        inputRef={ref}
        label={label}
        error={Boolean(error)}
        helperText={error || helperText}
        className={className}
        InputProps={icon ? { startAdornment: icon } : undefined}
        {...props}
      />
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
  const selectId = props.label ? `select-${props.label.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  return (
    <FormControl fullWidth size="small" error={Boolean(props.error)} className={props.className}>
      {props.label ? <InputLabel htmlFor={selectId}>{props.label}</InputLabel> : null}
      <NativeSelect
        id={selectId}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
      >
        {props.children}
      </NativeSelect>
      <FormHelperText>{props.error || props.helperText}</FormHelperText>
    </FormControl>
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
      <TextField
        fullWidth
        multiline
        minRows={3}
        label={label}
        error={Boolean(error)}
        helperText={error || helperText}
        inputRef={ref}
        className={className}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
