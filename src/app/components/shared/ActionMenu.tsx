"use client";

import { useState, useRef, useEffect } from "react";

export interface ActionMenuItem {
  label: string;
  icon: "edit" | "trash" | "check" | "x" | "drag";
  tone: "primary" | "secondary" | "success" | "danger" | "neutral";
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Menú desplegable de acciones mejorado con iconos
 */
export function ActionMenu(props: {
  actions: ActionMenuItem[];
  buttonLabel?: string;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const getIconSvg = (icon: string) => {
    const iconProps = "w-4 h-4";
    switch (icon) {
      case "edit":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "trash":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case "check":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "x":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "drag":
        return (
          <svg className={iconProps} fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getToneClasses = (tone: string) => {
    switch (tone) {
      case "primary":
        return "hover:bg-blue-50 text-blue-700 hover:text-blue-900";
      case "success":
        return "hover:bg-green-50 text-green-700 hover:text-green-900";
      case "danger":
        return "hover:bg-red-50 text-red-700 hover:text-red-900";
      case "secondary":
        return "hover:bg-gray-100 text-gray-700 hover:text-gray-900";
      default:
        return "hover:bg-gray-50 text-gray-600 hover:text-gray-900";
    }
  };

  // Si solo hay una acción, renderizar como botón simple
  if (props.actions.length === 1 && !props.buttonLabel) {
    const action = props.actions[0];
    return (
      <button
        onClick={() => {
          action.onClick();
          setIsOpen(false);
        }}
        disabled={action.disabled}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${getToneClasses(action.tone)}`}
      >
        {getIconSvg(action.icon)}
        {action.label}
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 rounded-lg bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 transition-colors"
      >
        {props.buttonLabel || "Acciones"}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          {props.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              disabled={action.disabled}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 first:rounded-t-lg last:rounded-b-lg ${getToneClasses(action.tone)}`}
            >
              {getIconSvg(action.icon)}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
