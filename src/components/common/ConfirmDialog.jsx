import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'

export default function ConfirmDialog({
  open,
  title = 'Emin misiniz?',
  description = 'Bu işlem geri alınamaz.',
  confirmText = 'Evet',
  cancelText = 'Vazgeç',
  tone = 'error', // 'error' | 'warning' | 'info' | 'success'
  onClose,
}) {
  const handleClose = (_, reason) => {
    // backdrop click / esc => iptal gibi davransın
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      onClose?.(false)
      return
    }
    onClose?.(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" component="div">
          {description}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose?.(false)}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={tone}
          onClick={() => onClose?.(true)}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}


