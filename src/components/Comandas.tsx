import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Comanda } from '../types';
import { Search, Grid, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ComandasProps {
  comandas: Record<number, Comanda>;
  onOpenComanda: (id: number) => void;
}

export default function Comandas({ comandas, onOpenComanda }: ComandasProps) {
  const [filter, setFilter] = useState<'all' | 'livre' | 'aberta'>('all');
  const [search, setSearch] = useState('');

  const getElapsedStr = (openedAt: number | null) => {
    if (!openedAt) return '';
    const diff = Math.floor((Date.now() - openedAt) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
    return `${m}m${String(s).padStart(2, '0')}s`;
  };

  const subTotal = (c: Comanda) => c.items.reduce((s, it) => s + it.price * it.qty, 0);
  const cmdTotal = (c: Comanda) => Math.max(0, subTotal(c) - (c.discount || 0));

  const allComandas = Object.values(comandas);

  const counts = {
    all: allComandas.length,
    livre: allComandas.filter(c => c.status === 'livre').length,
    aberta: allComandas.filter(c => c.status === 'aberta').length,
  };

  let filtered = allComandas;
  if (filter !== 'all') {
    filtered = filtered.filter(c => c.status === filter);
  }

  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c => 
      String(c.id).includes(s) ||
      c.mesa.toLowerCase().includes(s) ||
      c.garcom.toLowerCase().includes(s)
    );
  }

  filtered.sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#161B22] border border-[#30363D] p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-2.5 text-[#8B949E]" size={15} />
            <input
              type="text"
              placeholder="Nº, mesa ou garçom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#E6EDF3] placeholder-[#484F58] outline-none focus:border-amber-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-amber-500 border-amber-500 text-[#090D14]'
                  : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              Todas ({counts.all})
            </button>
            <button
              onClick={() => setFilter('livre')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                filter === 'livre'
                  ? 'bg-gray-500 border-gray-500 text-white'
                  : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              ⚪ Livres ({counts.livre})
            </button>
            <button
              onClick={() => setFilter('aberta')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                filter === 'aberta'
                  ? 'bg-emerald-500 border-emerald-500 text-[#090D14]'
                  : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]'
              }`}
            >
              🟢 Abertas ({counts.aberta})
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[11px] text-[#8B949E] font-medium items-center self-end md:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#30363D]"></span>
            <span>Livre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Aberta</span>
          </div>
        </div>
      </div>

      {/* Comandas Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center text-[#484F58]">
          <Grid size={36} className="mx-auto mb-2" />
          <p className="text-sm">Nenhuma comanda encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
          {filtered.map(c => {
            const open = c.status === 'aberta';
            const totalItems = c.items.reduce((sum, item) => sum + item.qty, 0);
            const totalVal = open ? cmdTotal(c) : 0;

            let cardStyles = 'bg-[#161B22] border-[#21262D] text-[#484F58] hover:border-[#8B949E]/40 hover:text-[#8B949E]';
            if (open) {
              cardStyles = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5';
            }

            return (
              <motion.div
                key={c.id}
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => onOpenComanda(c.id)}
                className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all p-2 select-none ${cardStyles}`}
              >
                {/* Badge for total items count inside comanda */}
                {open && totalItems > 0 && (
                  <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-emerald-500 text-[#090D14]`}>
                    {totalItems}
                  </span>
                )}

                <span className="text-xl font-extrabold tracking-tight block">
                  {c.id}
                </span>

                {open && (
                  <>
                    <span className="text-[9px] opacity-90 truncate max-w-full text-center font-semibold mt-0.5">
                      {c.mesa || '—'}
                    </span>
                    <span className="text-[8px] font-mono opacity-70 mt-1">
                      {getElapsedStr(c.openedAt)}
                    </span>
                    {totalVal > 0 && (
                      <span className="text-[10px] font-bold text-white mt-1.5">
                        R${totalVal.toFixed(0)}
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
