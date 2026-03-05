"use client";

import type { AdminNotification } from "../hooks/useAdminNotifications";

type Props = {
  title?: string;

  // Left: messages button
  unreadMessagesCount: number;
  onOpenMessages: () => void;

  // Right: notifications
  totalNotifications: number;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  notifications: AdminNotification[];

  // Close dropdown
  onCloseNotifications?: () => void;

  // Optional avatar
  avatarLetter?: string;
};

export default function HeaderBar({
  title = "PRESTİGESO YÖNETİM PANELİ",
  unreadMessagesCount,
  onOpenMessages,
  totalNotifications,
  isNotificationsOpen,
  setIsNotificationsOpen,
  notifications,
  onCloseNotifications,
  avatarLetter = "A",
}: Props) {
  const close = () => {
    setIsNotificationsOpen(false);
    onCloseNotifications?.();
  };

  return (
    <div className="bg-white px-6 py-4 flex items-center justify-between relative z-50 border-b border-gray-100">
      {/* LEFT: Messages */}
      <button
        onClick={onOpenMessages}
        className="text-2xl hover:scale-110 transition-transform relative"
        title="Müşteri Mesajları"
      >
        ✉️
        {unreadMessagesCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] font-black text-white">
            {unreadMessagesCount}
          </span>
        )}
      </button>

      {/* CENTER: Title */}
      <h1 className="text-xl font-black text-gray-900 tracking-widest uppercase">
        {title}
      </h1>

      {/* RIGHT: Notifications + Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="text-2xl hover:scale-110 transition-transform relative"
            title="Bildirimler"
          >
            🔔
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-black text-white">
                {totalNotifications > 99 ? "99+" : totalNotifications}
              </span>
            )}
          </button>

          {/* DROPDOWN */}
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-4 w-[350px] md:w-[400px] bg-white border border-gray-100 shadow-2xl rounded-2xl flex flex-col z-[1000] origin-top-right animate-in fade-in scale-95 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <span className="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Canlı Akış
                </span>
                <button
                  onClick={close}
                  className="text-gray-400 hover:text-black font-bold text-lg leading-none"
                  aria-label="Bildirimleri kapat"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <span className="text-4xl block mb-3 opacity-50">🎉</span>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Bekleyen bildirim yok.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => notif.onClick?.()}
                      className="w-full p-4 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors group"
                    >
                      {/* Color stripe */}
                      <div
                        className={`w-1 h-10 rounded-full flex-shrink-0 ${
                          notif.type === "order"
                            ? "bg-green-500"
                            : notif.type === "message"
                            ? "bg-blue-500"
                            : notif.type === "question"
                            ? "bg-purple-500"
                            : notif.type === "review"
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                      />

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-black text-gray-900 truncate">
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {notif.subtitle}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="text-[9px] font-bold text-gray-400 whitespace-nowrap text-right flex flex-col items-end justify-center">
                        {notif.timeAgo}
                      </div>

                      {/* Icon / Image */}
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center ml-2">
                        {notif.type === "message" ? (
                          <span className="text-xl group-hover:scale-110 transition-transform">
                            💌
                          </span>
                        ) : (
                          <img
                            src={notif.image || "/logo.jpeg"}
                            className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform"
                            alt=""
                          />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md cursor-pointer hover:scale-105 transition-transform">
          {avatarLetter}
        </div>
      </div>
    </div>
  );
}