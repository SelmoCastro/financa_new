import React, { useState, useEffect } from 'react';

const ANDROID_APK_URL = 'https://finanzaai.tech/downloads/';

export const SmartBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const dismissed = sessionStorage.getItem('smartBannerDismissed');
    if (isAndroid && !dismissed) {
      setVisible(true);
      document.body.style.paddingTop = '52px';
    }
    return () => { document.body.style.paddingTop = ''; };
  }, []);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem('smartBannerDismissed', 'true');
    document.body.style.paddingTop = '';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg h-[52px]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-full gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Android icon */}
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
              <path d="M17.523 15.341a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m-11.046 0a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m11.405-6.02l1.996-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-2.02 3.5C15.56 8.341 13.854 7.99 12 7.99s-3.56.351-5.14.976L4.84 5.466a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.997 3.46C3.024 11.462 1.2 14.097 1.2 17.1h21.6c0-3.003-1.824-5.638-4.918-7.779"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black tracking-wide truncate">Finanza AI para Android</p>
            <p className="text-[10px] text-indigo-200 font-medium truncate">Melhor experiência no app nativo</p>
          </div>
        </div>
        <a
          href={ANDROID_APK_URL}
          className="flex-shrink-0 bg-white text-indigo-700 font-black text-[10px] uppercase tracking-widest px-5 py-2 rounded-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-md"
        >
          Baixar App
        </a>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors p-1 ml-1"
          title="Dispensar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};