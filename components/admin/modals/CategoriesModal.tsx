import { useState } from "react";
import type { CategoryRow } from "../types";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Using adminDb structure if needed, but since we are in client, let's use supabase client or adminDb
// Wait, we should use adminDb because of SEC-07! 
import { adminDb } from "../adminDb";
import type { ShowConfirmOptions, ShowToastOptions, AppToastType } from "@/context/AppAlertContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryRow[];
  onRefresh: () => void;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
};

export default function CategoriesModal({
  isOpen,
  onClose,
  categories,
  onRefresh,
  showToast,
  showConfirm,
}: Props) {
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!newCatName.trim()) return showToast("Kategori adı boş olamaz.", "error");
    setLoading(true);
    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const { error } = await adminDb({ action: "insert", table: "categories", data: { name: newCatName.trim(), slug } });
    setLoading(false);
    
    if (error) {
      showToast("Kategori eklenemedi.", "error");
    } else {
      showToast("Kategori eklendi.", "success");
      setNewCatName("");
      onRefresh();
    }
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    setLoading(true);
    const slug = editName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const { error } = await adminDb({ action: "update", table: "categories", data: { name: editName.trim(), slug }, filters: [{ column: "id", op: "eq", value: id }] });
    setLoading(false);

    if (error) {
      showToast("Kategori güncellenemedi.", "error");
    } else {
      showToast("Kategori güncellendi.", "success");
      setEditingId(null);
      onRefresh();
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await showConfirm({
      title: "Kategoriyi Sil",
      message: "Bu kategoriyi silmek istediğinize emin misiniz?",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger"
    });
    
    if (!ok) return;

    setLoading(true);
    const { error } = await adminDb({ action: "delete", table: "categories", filters: [{ column: "id", op: "eq", value: id }] });
    setLoading(false);
    
    if (error) {
      showToast("Kategori silinemedi.", "error");
    } else {
      showToast("Kategori silindi.", "success");
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Kategoriler</h2>
            <p className="text-sm text-gray-500 mt-1">Dinamik kategori yönetimi</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          <div className="flex gap-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <input
              type="text"
              placeholder="Yeni Kategori Adı"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <button
              disabled={loading}
              onClick={handleAdd}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
            >
              <span>➕</span> Ekle
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {categories.length === 0 ? (
              <p className="p-6 text-center text-gray-500">Kayıtlı kategori bulunamadı.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                    {editingId === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-black"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <button onClick={() => handleEdit(cat.id)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">Kaydet</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700">İptal</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-bold text-gray-900">{cat.name}</p>
                          <p className="text-xs text-gray-400">/{cat.slug}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-lg"
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-lg"
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
