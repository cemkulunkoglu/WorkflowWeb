import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LeaveRequestModal from '../../components/LeaveRequestModal/LeaveRequestModal'
import NotesFlow from '../../components/Notes/NotesFlow'
import EmployeesOrgChartFlow from '../../components/EmployeeTree/EmployeesOrgChartFlow'

// Backend bağlantısı için gerekli importlar
import axiosClient from '../../config/axiosClient'
import { API_ROUTES, STORAGE_FLOW_ID_KEY, TOKEN_KEY, USER_KEY } from '../../config/apiConfig'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('surecler')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Akış tasarımları için state
  const [designList, setDesignList] = useState([])
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false)

  // Flow Editor Modal State
  const [showFlowModal, setShowFlowModal] = useState(false)
  const [selectedFlowId, setSelectedFlowId] = useState(null)

  // Kullanıcı bilgisini al
  const storedUser =
    localStorage.getItem(USER_KEY) || localStorage.getItem('user_info') || '{}'
  const user = JSON.parse(storedUser || '{}')

  const isFullNameSameAsEmail =
    user.fullName && user.email && user.fullName === user.email

  let displayName = 'Kullanıcı'

  if (user.fullName && !isFullNameSameAsEmail) {
    displayName = user.fullName
  } else if (user.email === 'admin@sirket.com') {
    // Admin için özel gösterim
    displayName = 'Sistem Yöneticisi'
  } else if (user.full_name || user.name || user.displayName) {
    displayName = user.full_name || user.name || user.displayName
  } else if (user.email) {
    displayName = user.email
  }

  // --- BACKEND İŞLEMLERİ ---

  const fetchDesigns = async () => {
    setIsLoadingDesigns(true);
    try {
      // Backend'den listeyi çekiyoruz
      const response = await axiosClient.get(API_ROUTES.WORKFLOW.GET_ALL);
      setDesignList(response.data);
    } catch (error) {
      console.error("Tasarımlar yüklenirken hata:", error);
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  // Sadece "Akış Tasarımı" sekmesi aktif olduğunda veriyi çek
  useEffect(() => {
    if (activeTab === 'flow-design') {
      fetchDesigns();
    }
  }, [activeTab]);

  const handleCreateNewFlow = () => {
    setSelectedFlowId(null);
    setShowFlowModal(true);
  }

  const handleEditFlow = (id) => {
    setSelectedFlowId(id);
    setShowFlowModal(true);
  }

  const handleCloseFlowModal = () => {
    setShowFlowModal(false);
    setSelectedFlowId(null);
    // Modal kapanınca listeyi yenile ki son değişiklikler görünsün
    if (activeTab === 'flow-design') fetchDesigns();
  }

  const handleFlowSaveSuccess = () => {
    // Kayıt başarılı olduğunda listeyi güncelle
    if (activeTab === 'flow-design') fetchDesigns();
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('user_info');
    navigate('/');
  }

  // --- DUMMY VERİLER ---
  const surecler = [
    { id: 1, ad: 'İzin Talep Süreci', tarih: '20.11.2024', durum: 'Devam Ediyor' },
    { id: 2, ad: 'Masraf Bildirimi', tarih: '18.11.2024', durum: 'Tamamlandı' }
  ]
  const gelenKutusu = []
  const taleplerim = []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Üst Navbar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3 sm:py-0 sm:h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">İş Akışı Yönetimi</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-slate-600">
                Hoş geldiniz,{' '}
                <span className="font-semibold text-slate-800">
                  {displayName}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 font-medium self-start sm:self-auto"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab Menü */}
        <div className="mb-8">
          <div className="border-b border-slate-200 -mx-3 sm:mx-0">
            <nav
              className="flex gap-4 sm:gap-8 overflow-x-auto px-3 sm:px-0"
              aria-label="Tabs"
            >
              <button
                onClick={() => setActiveTab('surecler')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'surecler' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Süreçler
              </button>
              <button
                onClick={() => setActiveTab('gelen-kutusu')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'gelen-kutusu' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Gelen Kutusu
              </button>
              <button
                onClick={() => setActiveTab('taleplerim')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'taleplerim' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Taleplerim
              </button>
              <button
                onClick={() => setActiveTab('flow-design')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'flow-design' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Akış Tasarımı
              </button>
              <button
                onClick={() => setActiveTab('org-chart')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'org-chart'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Çalışan Hiyerarşisi
              </button>
            </nav>
          </div>
        </div>

        {/* İçerik Alanı */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 min-h-[320px] sm:min-h-[400px]">
          
          {/* 1. TAB: Süreçler */}
          {activeTab === 'surecler' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Süreçler</h2>
                <p className="text-xs sm:text-sm text-slate-600">Aktif iş akışı süreçleriniz</p>
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                        <div>
                          <h3 className="font-semibold text-slate-800 mb-1 text-sm sm:text-base">
                            {surec.ad}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600">Tarih: {surec.tarih}</p>
                        </div>
                        <span className="inline-flex self-start sm:self-auto px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {surec.durum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. TAB: Gelen Kutusu */}
          {activeTab === 'gelen-kutusu' && (
             <div className="text-slate-500 text-center py-8">Gelen kutusunda mesaj bulunmamaktadır.</div>
          )}

          {/* 3. TAB: Taleplerim */}
          {activeTab === 'taleplerim' && (
            <div>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Taleplerim</h2>
                  <p className="text-xs sm:text-sm text-slate-600">Oluşturduğunuz talepler</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 self-start sm:self-auto"
                >
                  Yeni Talep
                </button>
              </div>
              <p className="text-slate-500 text-center py-8">Henüz talep bulunmamaktadır.</p>
            </div>
          )}

          {/* 4. TAB: Akış Tasarımı */}
          {activeTab === 'flow-design' && (
            <div>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Akış Tasarımlarım</h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Kayıtlı tasarımlarınızı düzenleyin veya yeni oluşturun.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewFlow}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 self-start sm:self-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Yeni Tasarım
                </button>
              </div>

              {isLoadingDesigns ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : designList.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-slate-500 mb-4">Henüz hiç tasarımınız yok.</p>
                    <button onClick={handleCreateNewFlow} className="text-blue-600 hover:underline font-medium">İlk tasarımını oluştur</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {designList.map((design) => (
                    <div 
                      key={design.id} 
                      onClick={() => handleEditFlow(design.id)}
                      className="group border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer bg-white relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {design.designName || 'İsimsiz Tasarım'}
                      </h3>
                      <p className="text-xs text-slate-400">Kayıtlı Tasarım</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. TAB: Çalışan Hiyerarşisi */}
          {activeTab === 'org-chart' && (
            <div className="h-full">
              <EmployeesOrgChartFlow />
            </div>
          )}
        </div>
      </div>

      {/* İzin Talep Modal */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(data) => console.log(data)}
      />

      {/* Flow Editor Modal */}
      {showFlowModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-[95vw] h-[90vh] shadow-2xl overflow-hidden relative flex flex-col">
                <NotesFlow 
                    flowId={selectedFlowId}
                    onClose={handleCloseFlowModal}
                    onSaveSuccess={handleFlowSaveSuccess}
                />
            </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard