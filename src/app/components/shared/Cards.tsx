"use client";

import { type ReactNode } from "react";

/**
 * Card mejorado con variantes y sombra
 */
export function Card(props: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}) {
  const { variant = "default", padding = "md", hover = false } = props;

  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const variantClasses = {
    default: "ej-card",
    elevated: "bg-white shadow-lg border border-stone-200",
    outlined: "bg-white border-2 border-stone-300",
  };

  return (
    <div
      className={`
        rounded-2xl transition-all duration-200
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? "hover:shadow-xl hover:-translate-y-1" : ""}
        ${props.className || ""}
      `}
    >
      {props.children}
    </div>
  );
}

/**
 * Card header con título y descripción
 */
export function CardHeader(props: {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-900">{props.title}</h2>
          {props.badge}
        </div>
        {props.description && (
          <p className="mt-1 text-sm text-stone-600">{props.description}</p>
        )}
      </div>
      {props.action && <div className="flex-shrink-0">{props.action}</div>}
    </div>
  );
}

/**
 * Stat card para mostrar métricas
 */
export function StatCard(props: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:shadow-md
        ${props.className || ""}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {props.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{props.value}</p>
          
          {props.trend && (
            <div className="mt-2 flex items-center gap-1">
              {props.trend.direction === "up" && (
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {props.trend.direction === "down" && (
                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              <span className={`text-xs font-medium ${
                props.trend.direction === "up" ? "text-green-600" :
                props.trend.direction === "down" ? "text-red-600" :
                "text-stone-600"
              }`}>
                {props.trend.value > 0 ? "+" : ""}{props.trend.value}% {props.trend.label}
              </span>
            </div>
          )}
        </div>
        
        {props.icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
            {props.icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState(props: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
      {props.icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-stone-500">
          {props.icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-stone-900">{props.title}</h3>
      {props.description && (
        <p className="mt-2 text-sm text-stone-600">{props.description}</p>
      )}
      {props.action && <div className="mt-4">{props.action}</div>}
    </div>
  );
}

/**
 * Badge component
 */
export function Badge(props: {
  children: ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { variant = "default", size = "md" } = props;

  const variantClasses = {
    default: "bg-stone-100 text-stone-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${props.className || ""}
      `}
    >
      {props.children}
    </span>
  );
}
