"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { LoadingInline } from "./LoadingSpinner";

/**
 * Dialogo de confirmacion reutilizable
 */
export function ConfirmDialog(props: {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onClose={props.isLoading ? undefined : props.onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{props.title}</DialogTitle>

      {props.description ? (
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{props.description}</Typography>
        </DialogContent>
      ) : null}

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={props.onCancel}
            disabled={props.isLoading}
            variant="outlined"
            color="secondary"
            sx={{ minWidth: 120 }}
          >
            {props.cancelText || "Cancelar"}
          </Button>
          <Button
            onClick={props.onConfirm}
            disabled={props.isLoading}
            color={props.isDangerous ? "error" : "primary"}
            variant="contained"
            sx={{ minWidth: 140 }}
          >
            {props.isLoading ? (
              <LoadingInline
                label="Procesando..."
                size="xs"
                tone="light"
                textClassName="MuiTypography-root"
              />
            ) : (
              props.confirmText || "Confirmar"
            )}
          </Button>
      </DialogActions>
    </Dialog>
  );
}
