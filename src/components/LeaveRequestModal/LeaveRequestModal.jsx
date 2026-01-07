import { useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'

function LeaveRequestModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setSubmitError('')
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const dayCount = useMemo(() => {
    const { startDate, endDate } = formData
    if (!startDate || !endDate) return 0
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    if (end < start) return 0
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    return diffDays + 1 // inclusive
  }, [formData])

  useEffect(() => {
    if (!isOpen) return
    // modal açıldığında eski hataları temizle
    setErrors({})
    setSubmitError('')
    setIsSubmitting(false)
  }, [isOpen])

  const validate = () => {
    const next = {}
    if (!formData.startDate) next.startDate = 'Başlangıç tarihi boş olamaz.'
    if (!formData.endDate) next.endDate = 'Bitiş tarihi boş olamaz.'
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T00:00:00`)
      const end = new Date(`${formData.endDate}T00:00:00`)
      if (end < start) next.endDate = 'Bitiş tarihi, başlangıç tarihinden küçük olamaz.'
    }
    const reason = (formData.reason || '').trim()
    if (reason.length < 3) next.reason = 'Açıklama en az 3 karakter olmalı.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSubmit({
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      })
      // başarılı -> reset + close
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
      })
      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'İzin talebi oluşturulurken bir hata oluştu.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      startDate: '',
      endDate: '',
      reason: '',
    })
    setErrors({})
    setSubmitError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">İzin Talep Formu</h2>
          <Button
            variant="text"
            disableRipple
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            sx={{ minWidth: 'auto', padding: 0, textTransform: 'none' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {submitError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label 
              htmlFor="startDate" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Başlangıç Tarihi
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200"
              required
            />
            {errors.startDate ? (
              <p className="mt-2 text-xs text-red-600">{errors.startDate}</p>
            ) : null}
          </div>

          <div>
            <label 
              htmlFor="endDate" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Bitiş Tarihi
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200"
              required
            />
            {errors.endDate ? (
              <p className="mt-2 text-xs text-red-600">{errors.endDate}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Açıklama
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={4}
              value={formData.reason}
              onChange={handleChange}
              placeholder="İzin talebi açıklaması"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200 resize-none"
            />
            {errors.reason ? (
              <p className="mt-2 text-xs text-red-600">{errors.reason}</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center justify-between">
            <span className="font-semibold">Gün Sayısı</span>
            <span>{dayCount > 0 ? dayCount : '-'}</span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
              sx={{ textTransform: 'none' }}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 text-white font-semibold rounded-lg transition-colors duration-200 ${
                isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              sx={{ textTransform: 'none' }}
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LeaveRequestModal

