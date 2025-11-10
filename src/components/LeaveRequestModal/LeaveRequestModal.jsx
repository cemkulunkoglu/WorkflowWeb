import { useState } from 'react'

function LeaveRequestModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    startDate: '',
    endDate: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Form gönderimi buraya eklenecek
    console.log('İzin talep formu gönderiliyor:', formData)
    onSubmit(formData)
    // Formu sıfırla
    setFormData({
      fullName: '',
      startDate: '',
      endDate: ''
    })
    onClose()
  }

  const handleClose = () => {
    setFormData({
      fullName: '',
      startDate: '',
      endDate: ''
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">İzin Talep Formu</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label 
              htmlFor="fullName" 
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Ad Soyad
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Adınız ve soyadınız"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all duration-200"
              required
            />
          </div>

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
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors duration-200"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LeaveRequestModal

