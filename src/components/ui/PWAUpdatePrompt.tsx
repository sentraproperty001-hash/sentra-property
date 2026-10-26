import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <aside
      role="status"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-2xl border border-[#E8E5DD] bg-white p-4 text-[#142544] shadow-xl"
    >
      <p className="text-sm font-bold">Pembaruan Sentra Property tersedia</p>
      <p className="mt-1 text-xs text-[#6B7280]">
        Aplikasi tidak akan dimuat ulang sendiri. Perbarui saat formulir Anda sudah siap.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg border border-[#E8E5DD] px-3 py-2 text-xs font-semibold hover:bg-[#F8F7F3]"
        >
          Nanti
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-lg bg-[#142544] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0B1730]"
        >
          Perbarui sekarang
        </button>
      </div>
    </aside>
  );
};
