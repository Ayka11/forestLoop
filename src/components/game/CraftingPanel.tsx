import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, Hammer } from 'lucide-react';
import { CRAFT_RECIPES, Resources } from '@/game/types';

export default function CraftingPanel() {
  const { setScreen, gameState, engine } = useGame();
  if (!gameState) return null;

  const resources = gameState.resources;

  const canCraft = (cost: Partial<Resources>) => {
    for (const [key, amount] of Object.entries(cost)) {
      if ((resources[key as keyof Resources] || 0) < (amount || 0)) return false;
    }
    return true;
  };

  const handleCraft = (recipeId: string) => {
    const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe || !engine.current) return;
    engine.current.craft(recipe);
  };

  const handleClose = () => {
    setScreen('playing');
    if (engine.current?.state.isPaused) {
      engine.current.pause();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-2xl p-4 max-w-md w-full mx-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hammer className="text-amber-400" size={20} />
            <h3 className="text-white font-bold">Quick Craft</h3>
          </div>
          <button onClick={handleClose} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Resources display */}
        <div className="flex gap-3 mb-3 bg-white/5 rounded-xl p-2">
          <ResDisplay icon="🪵" count={resources.wood} label="Wood" />
          <ResDisplay icon="🪨" count={resources.stone} label="Stone" />
          <ResDisplay icon="🌸" count={resources.flower} label="Flower" />
          <ResDisplay icon="🍃" count={resources.leaf} label="Leaf" />
        </div>

        {/* Recipes */}
        <div className="grid grid-cols-2 gap-2">
          {CRAFT_RECIPES.map(recipe => {
            const craftable = canCraft(recipe.cost);
            return (
              <button
                key={recipe.id}
                onClick={() => craftable && handleCraft(recipe.id)}
                disabled={!craftable}
                className={`p-3 rounded-xl border transition-all text-left ${
                  craftable
                    ? 'border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95'
                    : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{recipe.icon}</span>
                  <span className="text-white font-bold text-sm">{recipe.name}</span>
                </div>
                <div className="text-white/50 text-[10px] mb-1.5">{recipe.description}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(recipe.cost).map(([key, amount]) => {
                    const icons: Record<string, string> = { wood: '🪵', stone: '🪨', flower: '🌸', leaf: '🍃' };
                    const has = (resources[key as keyof Resources] || 0) >= (amount || 0);
                    return (
                      <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${has ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {icons[key]} {amount}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResDisplay({ icon, count, label }: { icon: string; count: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-white text-xs flex-1">
      <span>{icon}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}
