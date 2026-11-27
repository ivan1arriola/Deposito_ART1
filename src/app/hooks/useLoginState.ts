"use client";

import { useCallback, useState } from "react";
import type { ClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

export type LoginMode = "USUARIO" | "PERSONAL";

export function useLoginState() {
  const [loginMode, setLoginMode] = useState<LoginMode>("PERSONAL");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState("");

  const sanitizeLoginCi = useCallback((value: string) => value.replace(/\D+/g, "").slice(0, 8), []);

  const handleLoginUsernameChange = useCallback(
    (value: string) => {
      if (loginMode === "PERSONAL") {
        setLoginUsername(sanitizeLoginCi(value));
        return;
      }
      setLoginUsername(value);
    },
    [loginMode, sanitizeLoginCi]
  );

  const handleLoginUsernamePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      if (loginMode !== "PERSONAL") return;
      event.preventDefault();
      const pasted = event.clipboardData.getData("text");
      setLoginUsername(sanitizeLoginCi(pasted));
    },
    [loginMode, sanitizeLoginCi]
  );

  const handleLoginUsernameKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (loginMode !== "PERSONAL") return;

      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Tab",
        "Enter",
      ];
      if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;

      if (!/^[0-9]$/.test(event.key)) {
        event.preventDefault();
      }
    },
    [loginMode]
  );

  const handleSelectPersonalLogin = useCallback(() => {
    setLoginMode("PERSONAL");
    setShowResetRequest(false);
    setResetRequestMessage("");
  }, []);

  const handleSelectSystemLogin = useCallback(() => {
    setLoginMode("USUARIO");
    setShowResetRequest(false);
    setResetRequestMessage("");
  }, []);

  const handleToggleResetRequest = useCallback(() => {
    setShowResetRequest((current) => !current);
    setResetRequestMessage("");
    setResetUsername((current) => current || loginUsername.trim());
  }, [loginUsername]);

  return {
    loginMode,
    setLoginMode,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    showLoginPassword,
    setShowLoginPassword,
    loginLoading,
    setLoginLoading,
    showResetRequest,
    setShowResetRequest,
    resetUsername,
    setResetUsername,
    resetRequestLoading,
    setResetRequestLoading,
    resetRequestMessage,
    setResetRequestMessage,
    handleLoginUsernameChange,
    handleLoginUsernamePaste,
    handleLoginUsernameKeyDown,
    handleSelectPersonalLogin,
    handleSelectSystemLogin,
    handleToggleResetRequest,
  };
}
