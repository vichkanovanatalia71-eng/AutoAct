"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Zap, Clock, Globe } from "lucide-react";
import { getTemplates } from "@/lib/api";

const CATEGORIES = [
  "Усі", "Соціальні мережі", "Email маркетинг", "CRM", "E-commerce", "Аналітика",
  "DevOps", "Фінанси", "HR", "Підтримка клієнтів", "Контент", "SEO",
  "Реклама", "Сповіщення", "Синхронізація даних", "Звіти", "Планування",
  "Лідогенерація", "Моніторинг", "Бекап", "Інтеграції",
];

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  webhook: Zap,
  cron: Clock,
  manual: Globe,
};

export default function CatalogPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Усі");
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (search) params.search = search;
      if (category !== "Усі") params.category = category;

      const res = await getTemplates(params);
      setTemplates(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Каталог воркфлоу</h1>
      <p className="text-gray-600 mb-8">Оберіть автоматизацію з {total} готових шаблонів</p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Пошук воркфлоу..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === cat
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Завантаження...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Шаблони не знайдено</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t: any) => {
              const TriggerIcon = TRIGGER_ICONS[t.triggerType] || Zap;
              return (
                <Link
                  key={t.id}
                  href={`/catalog/${t.id}`}
                  className="bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="bg-primary-50 text-primary-700 text-xs px-3 py-1 rounded-full font-medium">
                      {t.category}
                    </span>
                    <TriggerIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{t.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(t.tags || []).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    {(t.requiredCredentials || []).length} сервіс(ів) · {t.nodeCount || 0} кроків
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                ←
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
