import { createContext, useContext, useState, useEffect } from 'react';

// ─── Translation strings ───────────────────────────────────────────────────
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard', myProfile: 'My Profile', findDoctor: 'Find Doctor',
    appointments: 'Appointments', aiConsultation: 'AI Consultation', reports: 'Reports',
    prescriptions: 'Prescriptions', myDocuments: 'My Documents', facilities: 'Facilities',
    schedule: 'Schedule', logout: 'Logout',
    // Dashboard
    welcomeBack: 'Welcome back',
    manageAppointments: 'Manage your practice and appointments',
    yourHealth: 'Your health dashboard',
    patientAppointments: 'Patient Appointments', myAppointments: 'My Appointments',
    accountStatus: 'Account Status', active: 'Active',
    quickActions: 'Quick Actions', manageFacilities: 'Manage Facilities',
    viewSchedule: 'View Schedule', findADoctor: 'Find a Doctor',
    startAIConsultation: 'Start AI Consultation',
    // Appointments
    dateTime: 'Date & Time', slot: 'Slot', patient: 'Patient',
    consultDuration: 'Consult Duration', status: 'Status', actions: 'Actions',
    noAppointments: 'No appointments yet', viewAIReport: 'AI Report',
    // Common
    save: 'Save', close: 'Close', edit: 'Edit', view: 'View',
    loading: 'Loading…', complete: 'Complete', cancel: 'Cancel',
    submit: 'Submit', search: 'Search', add: 'Add', remove: 'Remove',
    language: 'Language',
    doctor: 'Doctor', patient: 'Patient',
  },
  hi: {
    dashboard: 'डैशबोर्ड', myProfile: 'मेरी प्रोफ़ाइल', findDoctor: 'डॉक्टर खोजें',
    appointments: 'अपॉइंटमेंट', aiConsultation: 'AI परामर्श', reports: 'रिपोर्ट',
    prescriptions: 'नुस्खे', myDocuments: 'मेरे दस्तावेज़', facilities: 'सुविधाएं',
    schedule: 'शेड्यूल', logout: 'लॉगआउट',
    welcomeBack: 'वापस स्वागत है',
    manageAppointments: 'अपना अभ्यास और अपॉइंटमेंट प्रबंधित करें',
    yourHealth: 'आपका स्वास्थ्य डैशबोर्ड',
    patientAppointments: 'रोगी अपॉइंटमेंट', myAppointments: 'मेरी अपॉइंटमेंट',
    accountStatus: 'खाता स्थिति', active: 'सक्रिय',
    quickActions: 'त्वरित क्रियाएं', manageFacilities: 'सुविधाएं प्रबंधित करें',
    viewSchedule: 'शेड्यूल देखें', findADoctor: 'डॉक्टर खोजें',
    startAIConsultation: 'AI परामर्श शुरू करें',
    dateTime: 'दिनांक और समय', slot: 'स्लॉट', patient: 'रोगी',
    consultDuration: 'परामर्श अवधि', status: 'स्थिति', actions: 'क्रियाएं',
    noAppointments: 'अभी तक कोई अपॉइंटमेंट नहीं', viewAIReport: 'AI रिपोर्ट',
    save: 'सहेजें', close: 'बंद करें', edit: 'संपादित करें', view: 'देखें',
    loading: 'लोड हो रहा है…', complete: 'पूर्ण करें', cancel: 'रद्द करें',
    submit: 'जमा करें', search: 'खोजें', add: 'जोड़ें', remove: 'हटाएं',
    language: 'भाषा',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு', myProfile: 'என் சுயவிவரம்', findDoctor: 'மருத்துவர் தேடுங்கள்',
    appointments: 'சந்திப்புகள்', aiConsultation: 'AI ஆலோசனை', reports: 'அறிக்கைகள்',
    prescriptions: 'மருந்துச்சீட்டுகள்', myDocuments: 'என் ஆவணங்கள்', facilities: 'வசதிகள்',
    schedule: 'அட்டவணை', logout: 'வெளியேறு',
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்',
    manageAppointments: 'உங்கள் சந்திப்புகளை நிர்வகிக்கவும்',
    yourHealth: 'உங்கள் உடல்நல டாஷ்போர்டு',
    patientAppointments: 'நோயாளி சந்திப்புகள்', myAppointments: 'என் சந்திப்புகள்',
    accountStatus: 'கணக்கு நிலை', active: 'செயலில்',
    quickActions: 'விரைவு செயல்கள்', manageFacilities: 'வசதிகளை நிர்வகி',
    viewSchedule: 'அட்டவணை பார்க்க', findADoctor: 'மருத்துவர் தேடுங்கள்',
    startAIConsultation: 'AI ஆலோசனை தொடங்கு',
    dateTime: 'தேதி & நேரம்', slot: 'இடம்', patient: 'நோயாளி',
    consultDuration: 'ஆலோசனை நேரம்', status: 'நிலை', actions: 'செயல்கள்',
    noAppointments: 'இதுவரை சந்திப்புகள் இல்லை', viewAIReport: 'AI அறிக்கை',
    save: 'சேமி', close: 'மூடு', edit: 'திருத்து', view: 'பார்',
    loading: 'ஏற்றுகிறது…', complete: 'முடி', cancel: 'ரத்து செய்',
    submit: 'சமர்ப்பி', search: 'தேடு', add: 'சேர்', remove: 'அகற்று',
    language: 'மொழி',
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్', myProfile: 'నా ప్రొఫైల్', findDoctor: 'వైద్యుని వెతుకు',
    appointments: 'అపాయింట్‌మెంట్లు', aiConsultation: 'AI సలహా', reports: 'నివేదికలు',
    prescriptions: 'ప్రిస్క్రిప్షన్లు', myDocuments: 'నా పత్రాలు', facilities: 'సదుపాయాలు',
    schedule: 'షెడ్యూల్', logout: 'లాగ్‌అవుట్',
    welcomeBack: 'మళ్ళీ స్వాగతం',
    manageAppointments: 'మీ అపాయింట్‌మెంట్లను నిర్వహించండి',
    yourHealth: 'మీ ఆరోగ్య డాష్‌బోర్డ్',
    patientAppointments: 'రోగి అపాయింట్‌మెంట్లు', myAppointments: 'నా అపాయింట్‌మెంట్లు',
    accountStatus: 'ఖాతా స్థితి', active: 'చురుకైన',
    quickActions: 'త్వరిత చర్యలు', manageFacilities: 'సదుపాయాలు నిర్వహించు',
    viewSchedule: 'షెడ్యూల్ చూడు', findADoctor: 'వైద్యుని వెతుకు',
    startAIConsultation: 'AI సలహా ప్రారంభించు',
    dateTime: 'తేదీ & సమయం', slot: 'స్లాట్', patient: 'రోగి',
    consultDuration: 'సలహా వ్యవధి', status: 'స్థితి', actions: 'చర్యలు',
    noAppointments: 'ఇంకా అపాయింట్‌మెంట్లు లేవు', viewAIReport: 'AI నివేదిక',
    save: 'సేవ్', close: 'మూసివేయి', edit: 'సవరించు', view: 'చూడు',
    loading: 'లోడ్ అవుతోంది…', complete: 'పూర్తి', cancel: 'రద్దు',
    submit: 'సమర్పించు', search: 'వెతుకు', add: 'జోడించు', remove: 'తీసివేయి',
    language: 'భాష',
  },
  mr: {
    dashboard: 'डॅशबोर्ड', myProfile: 'माझे प्रोफाइल', findDoctor: 'डॉक्टर शोधा',
    appointments: 'अपॉइंटमेंट', aiConsultation: 'AI सल्लामसलत', reports: 'अहवाल',
    prescriptions: 'प्रिस्क्रिप्शन', myDocuments: 'माझे दस्तऐवज', facilities: 'सुविधा',
    schedule: 'वेळापत्रक', logout: 'लॉगआउट',
    welcomeBack: 'पुन्हा स्वागत आहे',
    manageAppointments: 'तुमच्या अपॉइंटमेंट व्यवस्थापित करा',
    yourHealth: 'तुमचे आरोग्य डॅशबोर्ड',
    patientAppointments: 'रुग्ण अपॉइंटमेंट', myAppointments: 'माझ्या अपॉइंटमेंट',
    accountStatus: 'खाते स्थिती', active: 'सक्रिय',
    quickActions: 'त्वरित क्रिया', manageFacilities: 'सुविधा व्यवस्थापित करा',
    viewSchedule: 'वेळापत्रक पहा', findADoctor: 'डॉक्टर शोधा',
    startAIConsultation: 'AI सल्लामसलत सुरू करा',
    dateTime: 'तारीख आणि वेळ', slot: 'स्लॉट', patient: 'रुग्ण',
    consultDuration: 'सल्लामसलत कालावधी', status: 'स्थिती', actions: 'क्रिया',
    noAppointments: 'अद्याप कोणत्याही अपॉइंटमेंट नाहीत', viewAIReport: 'AI अहवाल',
    save: 'जतन करा', close: 'बंद करा', edit: 'संपादित करा', view: 'पहा',
    loading: 'लोड होत आहे…', complete: 'पूर्ण करा', cancel: 'रद्द करा',
    submit: 'सादर करा', search: 'शोधा', add: 'जोडा', remove: 'काढा',
    language: 'भाषा',
  },
};

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
];

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('cm_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('cm_lang', lang);
  }, [lang]);

  const t = (key) => translations[lang]?.[key] ?? translations.en?.[key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

// ─── Google Translate integration for full-page translation ─────────────────
export function usePageTranslation() {
  const { lang } = useI18n();

  useEffect(() => {
    if (lang === 'en') {
      // Remove any active translation
      const el = document.querySelector('.skiptranslate');
      if (el) el.style.display = 'none';
      const body = document.body;
      body.style.top = '';
      const existing = document.getElementById('google-translate-element');
      if (existing) existing.innerHTML = '';
      return;
    }

    // Map our language codes to Google Translate codes
    const langMap = { hi: 'hi', ta: 'ta', te: 'te', mr: 'mr' };
    const googleLang = langMap[lang] || lang;

    // Inject Google Translate script if not already present
    if (!window.google?.translate?.TranslateElement) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: 'hi,ta,te,mr', autoDisplay: false },
          'google-translate-element'
        );
        // Auto-select the language after init
        setTimeout(() => triggerTranslate(googleLang), 800);
      };

      document.head.appendChild(script);
    } else {
      triggerTranslate(googleLang);
    }
  }, [lang]);
}

function triggerTranslate(lang) {
  try {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    }
  } catch {}
}
