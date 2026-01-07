import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LeaveRequestModal from '../../components/LeaveRequestModal/LeaveRequestModal'
import NotesFlow from '../../components/Notes/NotesFlow'
import EmployeesOrgChartFlow from '../../components/EmployeeTree/EmployeesOrgChartFlow'
import { useAuth } from '../../auth/AuthContext'
import MessagesPanel from '../../components/Messages/MessagesPanel'
import { LeaveRequestsApi } from '../../api/leaveRequestsApi'

// Backend bağlantısı için gerekli importlar
import axiosClient from '../../config/axiosClient'
import { API_ROUTES, STORAGE_FLOW_ID_KEY, TOKEN_KEY, USER_KEY } from '../../config/apiConfig'

function Dashboard() {
  const navigate = useNavigate()
  const { logout, isDesigner } = useAuth()
  const [activeTab, setActiveTab] = useState('surecler')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Akış tasarımları için state
  const [designList, setDesignList] = useState([])
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false)

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState([])
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(false)
  const [leaveRequestsError, setLeaveRequestsError] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [reasonQuery, setReasonQuery] = useState('')

  // lightweight toast
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: string }

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
      const response = await axiosClient.get(API_ROUTES.WORKFLOW.GET_MINE);
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

  const fetchMyLeaveRequests = async () => {
    setIsLoadingLeaveRequests(true)
    setLeaveRequestsError('')
    try {
      const data = await LeaveRequestsApi.getMyLeaveRequests()
      setLeaveRequests(data || [])
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'İzin talepleri yüklenirken hata oluştu.'
      setLeaveRequestsError(msg)
    } finally {
      setIsLoadingLeaveRequests(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'taleplerim') {
      fetchMyLeaveRequests()
    }
  }, [activeTab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Designer değilse org-chart tabında kalmasın
  useEffect(() => {
    if (!isDesigner && activeTab === 'org-chart') {
      setActiveTab('surecler');
    }
  }, [isDesigner, activeTab]);

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
    // AuthContext/storage temizliği + login sayfasına yönlendir
    logout();
    localStorage.removeItem('user_info');
    sessionStorage.removeItem('user_info');
    navigate('/login', { replace: true });
  }

  // --- DUMMY VERİLER ---
  const surecler = [
    { id: 1, ad: 'İzin Talep Süreci', tarih: '20.11.2024', durum: 'Devam Ediyor' },
    { id: 2, ad: 'Masraf Bildirimi', tarih: '18.11.2024', durum: 'Tamamlandı' }
  ]
  const gelenKutusu = []

  const filteredLeaveRequests = leaveRequests
    .filter((x) => {
      if (statusFilter === 'All') return true
      const s = (x?.Status ?? '').toString().toLowerCase()
      return s === statusFilter.toLowerCase()
    })
    .filter((x) => {
      const q = reasonQuery.trim().toLowerCase()
      if (!q) return true
      return (x?.Reason ?? '').toString().toLowerCase().includes(q)
    })
    .sort((a, b) => {
      // Yeniden eskiye: CreatedAtUtc desc
      const da = a?.CreatedAtUtc ? new Date(a.CreatedAtUtc).getTime() : NaN
      const db = b?.CreatedAtUtc ? new Date(b.CreatedAtUtc).getTime() : NaN

      const aHas = Number.isFinite(da)
      const bHas = Number.isFinite(db)
      if (aHas && bHas) return db - da
      if (aHas && !bHas) return -1
      if (!aHas && bHas) return 1

      // fallback: StartDate desc
      const sa = a?.StartDate ? new Date(a.StartDate).getTime() : NaN
      const sb = b?.StartDate ? new Date(b.StartDate).getTime() : NaN
      const aS = Number.isFinite(sa)
      const bS = Number.isFinite(sb)
      if (aS && bS) return sb - sa
      if (aS && !bS) return -1
      if (!aS && bS) return 1

      // fallback: LeaveRequestId desc (numeric)
      const ia = Number(a?.LeaveRequestId)
      const ib = Number(b?.LeaveRequestId)
      if (Number.isFinite(ia) && Number.isFinite(ib)) return ib - ia
      return 0
    })

  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('tr-TR')
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('tr-TR')
  }

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
        {toast ? (
          <div className="mb-4">
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                toast.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

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
                onClick={() => setActiveTab('messages')}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Mesajlar
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
              {isDesigner ? (
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
              ) : null}
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

          {/* 2. TAB: Mesajlar */}
          {activeTab === 'messages' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Mesajlar</h2>
              </div>
              <MessagesPanel />
            </div>
          )}

          {/* 3. TAB: Taleplerim */}
          {activeTab === 'taleplerim' && (
            <div>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Taleplerim</h2>
                  <p className="text-xs sm:text-sm text-slate-600">Oluşturduğunuz talepler</p>
                </div>
                <div className="flex flex-col gap-3 w-full sm:w-auto sm:items-end">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-44">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      >
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                      <input
                        value={reasonQuery}
                        onChange={(e) => setReasonQuery(e.target.value)}
                        placeholder="Açıklamada ara..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 self-start sm:self-auto"
                  >
                    Yeni Talep
                  </button>
                </div>
              </div>

              {isLoadingLeaveRequests ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : leaveRequestsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {leaveRequestsError}
                </div>
              ) : filteredLeaveRequests.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-slate-500 mb-4">Henüz talep bulunmamaktadır.</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    İlk talebini oluştur
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Başlangıç Tarihi
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Bitiş Tarihi
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Gün Sayısı
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Açıklama
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Durum
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 border-b border-slate-200">
                          Oluşturulma
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaveRequests.map((r, idx) => (
                        <tr
                          key={r.LeaveRequestId ?? idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                            {formatDate(r.StartDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                            {formatDate(r.EndDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                            {r.DayCount ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200 max-w-[420px]">
                            <div className="truncate" title={r.Reason}>
                              {r.Reason || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                            {r.Status ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                            {formatDateTime(r.CreatedAtUtc)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

          {/* 5. TAB: Çalışan Hiyerarşisi (Designer only) */}
          {isDesigner && activeTab === 'org-chart' && (
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
        onSubmit={async (payload) => {
          await LeaveRequestsApi.createLeaveRequest(payload)
          setToast({ type: 'success', message: 'İzin talebi başarıyla oluşturuldu.' })
          await fetchMyLeaveRequests()
        }}
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