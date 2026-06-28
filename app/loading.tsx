export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Yükleniyor
        </p>
      </div>
    </div>
  );
}
