export default function SettingsTab({ user }: { user: any }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
        Hesap Ayarlarım
      </h3>
      <div className="max-w-md space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">E-Posta Adresi</label>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold text-gray-500 cursor-not-allowed">
            {user?.email}
          </div>
        </div>
        <button className="bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all w-full md:w-auto mt-4 shadow-md">
          Bilgileri Güncelle
        </button>
      </div>
    </div>
  );
}