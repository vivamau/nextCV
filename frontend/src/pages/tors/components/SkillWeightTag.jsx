import { useState, useRef, useEffect } from 'react';

export default function SkillWeightTag({ skill, weight, onWeightChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative group flex items-center bg-white border border-purple-200 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer ${showPicker ? 'z-30' : 'z-auto'}`}
      onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
    >
      <div 
        className={`px-2 py-0.5 text-[10px] font-bold text-white flex items-center justify-center min-w-[24px] rounded-l-full hover:brightness-110 ${
          weight >= 4 ? 'bg-purple-600' : weight >= 3 ? 'bg-indigo-500' : 'bg-gray-400'
        }`}
      >
        {weight}
      </div>
      <span className="px-2.5 py-0.5 text-[10px] font-medium text-gray-700">{skill}</span>
      
      {showPicker && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 shadow-xl rounded-lg p-1 flex gap-0.5">
          {[1, 2, 3, 4, 5].map(w => (
            <button
              key={w}
              onClick={(e) => { e.stopPropagation(); onWeightChange(w); setShowPicker(false); }}
              className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${
                w === weight ? 'bg-purple-600 text-white' : 'hover:bg-purple-50 text-gray-600'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
