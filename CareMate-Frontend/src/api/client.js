import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => {
    const form = new URLSearchParams();
    form.append('username', data.username);
    form.append('password', data.password);
    return api.post('/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
};

// User
export const userAPI = {
  getMe: (username) => api.get(`/user/${username}`),
  changePassword: (data) => api.put('/user/change-password', data),
};

// Patient
export const patientAPI = {
  getProfile: () => api.get('/patient/profile'),
  createProfile: (data) => api.post('/patient/profile', data),
  updateProfile: (data) => api.patch('/patient/profile', data),
};

// Doctor
export const doctorAPI = {
  getProfile: () => api.get('/doctor/profile'),
  createProfile: (data) => api.post('/doctor/profile', data),
  updateProfile: (data) => api.patch('/doctor/profile', data),
};

// Facilities (Doctor)
export const facilityAPI = {
  list: () => api.get('/providers/'),
  create: (data) => api.post('/providers/', data),
  update: (id, data) => api.put(`/providers/${id}`, data),
  delete: (id) => api.delete(`/providers/${id}`),
};

// Scheduling (Doctor)
export const scheduleAPI = {
  create: (facilityId, data) => api.post(`/schedule/?facility_id=${facilityId}`, data),
  get: () => api.get('/schedule/'),
  update: (facilityId, data) => api.put(`/schedule/${facilityId}`, data),
  delete: (schedulingId) => api.delete(`/schedule/${schedulingId}`),
};

// Doctor Finder (Patient)
export const finderAPI = {
  listFacilities: () => api.get('/doctor-finder/facility'),
  listDoctors: (facilityId) => api.get(`/doctor-finder/doctor?facility_id=${facilityId}`),
  listSlots: (doctorId, date, facilityId) => {
    let url = `/doctor-finder/doctor-slots?doctor_id=${doctorId}`;
    if (date) url += `&target_date=${date}`;
    if (facilityId) url += `&facility_id=${facilityId}`;
    return api.get(url);
  },
};

// Booking (Patient)
export const bookingAPI = {
  create: (doctorId, facilityId, data) =>
    api.post(`/booking/create?facility_id=${facilityId}&doctor_id=${doctorId}`, data),
  patientAppointments: () => api.get('/booking/patient-appointments'),
  doctorAppointments: () => api.get('/booking/doctor-appointments'),
  updateStatus: (bookingId, data) => api.patch(`/booking/${bookingId}/status`, data),
};

// Chat (Patient)
export const chatAPI = {
  startInterview: () => api.post('/chat/start_interview'),
  nextMessage: (data) => api.post('/chat/next_message', data),
};

// Reports
export const reportAPI = {
  patientReport: () => api.get('/report/patient-report'),
  doctorReport: () => api.get('/report/doctor-report'),
  searchPatients: (q) => api.get(`/report/doctor/search-patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  patientReportsForDoctor: (patientId) => api.get(`/report/doctor/patient-reports/${patientId}`),
};

// Prescription
export const prescriptionAPI = {
  upsert: (data) => api.post('/prescription/', data),
  getByBooking: (bookingId) => api.get(`/prescription/booking/${bookingId}`),
  doctorAll: () => api.get('/prescription/doctor/all'),
  patientAll: () => api.get('/prescription/patient/all'),
};

// Documents
const multipartApi = axios.create({ baseURL: API_BASE_URL });
multipartApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const documentAPI = {
  doctorUpload: (formData) => multipartApi.post('/documents/doctor/upload', formData),
  doctorList: () => api.get('/documents/doctor/list'),
  patientUpload: (formData) => multipartApi.post('/documents/patient/upload', formData),
  patientList: () => api.get('/documents/patient/list'),
  download: (docId) => `${API_BASE_URL}/documents/download/${docId}`,
  delete: (docId) => api.delete(`/documents/delete/${docId}`),
  // Doctor view patient docs (for referral tests)
  patientDocsForDoctor: (patientId) => api.get(`/documents/doctor/patient/${patientId}/docs`),
};

// RxNorm medicine search (public API, no auth needed)
export const rxnormAPI = {
  search: async (term) => {
    if (!term || term.length < 2) return [];
    try {
      const res = await axios.get(
        `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(term)}`
      );
      const concepts = res.data?.drugGroup?.conceptGroup || [];
      const results = [];
      for (const group of concepts) {
        for (const concept of (group.conceptProperties || [])) {
          results.push({ rxcui: concept.rxcui, name: concept.name, synonym: concept.synonym });
          if (results.length >= 20) break;
        }
        if (results.length >= 20) break;
      }
      return results;
    } catch { return []; }
  },
};


// Reviews
export const reviewAPI = {
  create: (data) => api.post('/reviews/', data),
  getByBooking: (bookingId) => api.get(`/reviews/booking/${bookingId}`),
  doctorReviews: () => api.get('/reviews/doctor/my-reviews'),
  patientReviews: () => api.get('/reviews/patient/my-reviews'),
};

// Admin
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  getPatientProfile: (patientId) => api.get(`/admin/patient/${patientId}`),
};

// Drugs
export const drugAPI = {
  search: (q) => api.get(`/drugs/search?q=${encodeURIComponent(q)}`),
  popular: () => api.get('/drugs/popular'),
  add: (data) => api.post('/drugs', data),
  bulkImport: (formData) => multipartApi.post('/drugs/bulk-import', formData),
  downloadTemplate: () => `${API_BASE_URL}/drugs/download-template`,
  seedDatabase: () => api.post('/drugs/seed-database'),
  incrementUsage: (name) => api.post(`/drugs/increment-usage/${encodeURIComponent(name)}`),
};

// Avatar / Profile photo
export const avatarAPI = {
  upload: (formData) => multipartApi.post('/user/avatar', formData),
  getUrl: (userId) => `${API_BASE_URL}/user/avatar/${userId}`,
};

// TTS — SpeechT5
export const ttsAPI = {
  // Returns a Blob (audio/wav) — use responseType: 'arraybuffer'
  speak: (text) =>
    api.post('/tts/speak', { text }, { responseType: 'arraybuffer' }),
  health: () => api.get('/tts/health'),
};

// STT — AssemblyAI
export const sttAPI = {
  // mode: 'chat' (full transcript) | 'form' (single field value)
  transcribe: (audioBlob, mode = 'chat') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('mode', mode);
    return multipartApi.post('/stt/transcribe', formData);
  },
  health: () => api.get('/stt/health'),
};

export default api;

