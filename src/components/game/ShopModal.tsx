import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, ShoppingBag, Check, Lock, Sparkles } from 'lucide-react';
import ShopItemIcon from './ShopItemIcon';

const RARITY_COLORS = {
  common: { bg: 'from-gray-400 to-gray-500', border: 'border-gray-400', text: 'text-gray-300', label: 'Common' },
  rare: { bg: 'from-blue-400 to-blue-600', border: 'border-blue-400', text: 'text-blue-300', label: 'Rare' },
  epic: { bg: 'from-purple-400 to-purple-600', border: 'border-purple-400', text: 'text-purple-300', label: 'Epic' },
  legendary: { bg: 'from-yellow-400 to-orange-500', border: 'border-yellow-400', text: 'text-yellow-300', label: 'Legendary' },
};

const CATEGORY_ICONS: Record<string, string> = {
  skin: 'Skins', hat: 'Hats', pet: 'Pets', boost: 'Boosts', block: 'Blocks',
};

const CATEGORY_TINTS: Record<string, string> = {
  skin: 'rgba(255,140,66,0.06)',
  hat: 'rgba(156,39,176,0.06)',
  pet: 'rgba(233,30,99,0.06)',
  boost: 'rgba(33,150,243,0.06)',
  block: 'rgba(76,175,80,0.06)',
};

export default function ShopModal() {
  const { setScreen, shopItems, totalTokens, buyItem, equipItem } = useGame();
  const [category, setCategory] = useState<string>('skin');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState<string>('');

  const filteredItems = shopItems.filter(i => i.category === category);
  const selected = shopItems.find(i => i.id === selectedItem);

  const handleBuy = (id: string) => {
    const success = buyItem(id);
    if (success) {
      setBuyMessage('Purchased!');
      setTimeout(() => setBuyMessage(''), 2000);
    } else {
      setBuyMessage('Not enough tokens!');
      setTimeout(() => setBuyMessage(''), 2000);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-purple-400" size={24} />
            <h2 className="text-white font-black text-xl">Marketplace</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                <span className="text-yellow-800 font-bold text-[8px]">L</span>
              </div>
              <span className="text-yellow-300 font-bold text-sm">{totalTokens}</span>
            </div>
            <button onClick={() => setScreen('menu')} className="text-white/60 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1 p-3 overflow-x-auto">
          {Object.entries(CATEGORY_ICONS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setCategory(key); setSelectedItem(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                category === key
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {buyMessage && (
            <div className={`text-center py-2 mb-3 rounded-xl font-bold text-sm ${
              buyMessage === 'Purchased!' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {buyMessage}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const rarity = RARITY_COLORS[item.rarity];
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-white/10 ${
                    selectedItem === item.id ? `${rarity.border} bg-white/10` : 'border-white/5 bg-white/5 hover:border-white/20'
                  }`}
                  style={{ backgroundColor: selectedItem === item.id ? undefined : CATEGORY_TINTS[item.category] }}
                >
                  {/* Rarity badge */}
                  <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r ${rarity.bg} text-white`}>
                    {rarity.label}
                  </div>

                  {/* Item icon */}
                  <div
                    className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: item.color + '25' }}
                  >
                    <ShopItemIcon icon={item.icon} color={item.color} size={32} />
                  </div>
                  {item.rarity === 'legendary' && (
                    <div className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse border-2 border-yellow-400/30" />
                  )}

                  <div className="text-white font-bold text-xs truncate">{item.name}</div>
                  <div className="text-white/40 text-[10px] truncate">{item.description}</div>

                  {/* Price / Status */}
                  <div className="mt-2">
                    {item.owned ? (
                      item.equipped ? (
                        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold">
                          <Check size={12} /> Equipped
                        </div>
                      ) : (
                        <div className="text-blue-300 text-xs font-bold">Owned</div>
                      )
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-yellow-300 text-xs font-bold">
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        {item.price}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected item detail */}
          {selected && (
            <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selected.color + '25' }}
                >
                  <ShopItemIcon icon={selected.icon} color={selected.color} size={40} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{selected.name}</h3>
                  <p className="text-white/60 text-sm">{selected.description}</p>
                  <div className={`text-xs font-bold mt-1 ${RARITY_COLORS[selected.rarity].text}`}>
                    {RARITY_COLORS[selected.rarity].label}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {selected.owned ? (
                  <button
                    onClick={() => equipItem(selected.id)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      selected.equipped
                        ? 'bg-white/10 text-white/40'
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                  >
                    {selected.equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(selected.id)}
                    disabled={totalTokens < selected.price}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      totalTokens >= selected.price
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {totalTokens >= selected.price ? (
                      <>
                        <Sparkles size={16} />
                        Buy for {selected.price}
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        Need {selected.price - totalTokens} more
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
