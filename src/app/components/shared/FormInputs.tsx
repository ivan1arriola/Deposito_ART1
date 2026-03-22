"use client";

import { forwardRef } from "react";
import type { TextFieldProps } from "@mui/material/TextField";
import { FormControl, FormHelperText, InputLabel, NativeSelect, TextField } from "@mui/material";

export interface InputProps extends Omit<TextFieldProps, "error" | "helperText"> {
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

/**
 * Input mejorado con label, error y helper text
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, helperText, icon, InputProps: muiInputProps, ...props }, ref) => {
    return (
      <TextField
        fullWidth
        inputRef={ref}
        error={Boolean(error)}
        helperText={error || helperText}
        InputProps={{
          ...muiInputProps,
          startAdornment: icon ?? muiInputProps?.startAdornment,
        }}
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
  error?: string;
  helperText?: string;
} & Omit<TextFieldProps, "error" | "helperText" | "multiline">>(
  ({ error, helperText, ...props }, ref) => {
    return (
      <TextField
        fullWidth
        multiline
        minRows={3}
        error={Boolean(error)}
        helperText={error || helperText}
        inputRef={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
