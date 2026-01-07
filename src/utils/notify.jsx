import React from 'react'
import { toast } from 'react-toastify'
import { Button } from '@mui/material'

function toMessage(err, fallback) {
  if (!err) return fallback
  if (typeof err === 'string') return err

  const fromAxios =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message

  return fromAxios || fallback
}

export const notify = {
  success(message, options) {
    return toast.success(message, options)
  },
  error(message, options) {
    return toast.error(message, options)
  },
  info(message, options) {
    return toast.info(message, options)
  },
  warn(message, options) {
    return toast.warning(message, options)
  },
}

export function notifyApiError(err, fallback = 'Bir hata oluştu.') {
  return notify.error(toMessage(err, fallback))
}

export function confirmToast({
  title = 'Emin misiniz?',
  message = 'Bu işlem geri alınamaz.',
  confirmText = 'Evet, onayla',
  cancelText = 'Vazgeç',
  tone = 'warning', // 'warning' | 'error' | 'info'
} = {}) {
  return new Promise((resolve) => {
    let resolved = false

    const resolveOnce = (val) => {
      if (resolved) return
      resolved = true
      resolve(val)
    }

    const id = toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-sm text-slate-600">{message}</div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outlined"
              size="small"
              sx={{ textTransform: 'none' }}
              onClick={() => {
                closeToast?.()
                resolveOnce(false)
              }}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant="contained"
              color={tone === 'error' ? 'error' : tone === 'info' ? 'info' : 'warning'}
              size="small"
              sx={{ textTransform: 'none' }}
              onClick={() => {
                closeToast?.()
                resolveOnce(true)
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      ),
      {
        position: 'top-right',
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        onClose: () => resolveOnce(false),
      }
    )
    void id
  })
}


