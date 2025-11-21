import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotesFlow from '../Notes/NotesFlow'
import LeaveRequestModal from '../LeaveRequestModal/LeaveRequestModal'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('surecler')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const surecler = []
  const gelenKutusu = []
  const taleplerim = []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Üst Navbar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-800">İş Akışı Yönetimi</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Hoş geldiniz</span>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Menü */}
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex gap-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('surecler')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'surecler'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Süreçler
              </button>
              <button
                onClick={() => setActiveTab('gelen-kutusu')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'gelen-kutusu'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Gelen Kutusu
              </button>
              <button
                onClick={() => setActiveTab('taleplerim')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'taleplerim'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Taleplerim
              </button>
              <button
                onClick={() => setActiveTab('flow-design')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'flow-design'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Akış Tasarımı
              </button>
            </nav>
          </div>
        </div>

        {/* İçerik Alanı */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          {/* Süreçler */}
          {activeTab === 'surecler' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Süreçler</h2>
                <p className="text-sm text-slate-600">Aktif iş akışı süreçleriniz</p>
              </div>
              
              {surecler.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Henüz süreç bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {surecler.map((surec) => (
                    <div
                      key={surec.id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-slate-800 mb-1">{surec.ad}</h3>
                          <p className="text-sm text-slate-600">Tarih: {surec.tarih}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            surec.durum === 'Devam Ediyor'
                              ? 'bg-blue-100 text-blue-700'
                              : surec.durum === 'Tamamlandı'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {surec.durum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gelen Kutusu */}
          {activeTab === 'gelen-kutusu' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Gelen Kutusu</h2>
                <p className="text-sm text-slate-600">Bekleyen işlemleriniz</p>
              </div>
              
              {gelenKutusu.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Gelen kutusunda mesaj bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {gelenKutusu.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">{item.konu}</h3>
                          <p className="text-sm text-slate-600">Gönderen: {item.gonderici}</p>
                          <p className="text-xs text-slate-500 mt-1">Tarih: {item.tarih}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.durum === 'Yeni'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.durum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Taleplerim */}
          {activeTab === 'taleplerim' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Taleplerim</h2>
                  <p className="text-sm text-slate-600">Oluşturduğunuz talepler</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  Yeni Talep
                </button>
              </div>
              
              {taleplerim.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Henüz talep bulunmamaktadır.</p>
              ) : (
                <div className="space-y-4">
                  {taleplerim.map((talep) => (
                    <div
                      key={talep.id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">{talep.baslik}</h3>
                          <p className="text-sm text-slate-600 mb-1">{talep.aciklama}</p>
                          <p className="text-xs text-slate-500">Tarih: {talep.tarih}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            talep.durum === 'Onaylandı'
                              ? 'bg-green-100 text-green-700'
                              : talep.durum === 'Reddedildi'
                              ? 'bg-red-100 text-red-700'
                              : talep.durum === 'İşlemde'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {talep.durum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Akış Tasarımı (Birleştirilmiş Notes ve Flow) */}
          {activeTab === 'flow-design' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Akış Tasarımı</h2>
                <p className="text-sm text-slate-600">
                  İş akışlarını tasarlayın, kaydedin ve yönetin.
                </p>
              </div>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg relative overflow-visible">
                <NotesFlow />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* İzin Talep Modal */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => {
          console.log('İzin talep formu gönderildi:', data)
          // Göstermelik - gerçek servis bağlantısı eklenecek
        }}
      />
    </div>
  )
}

export default Dashboard
