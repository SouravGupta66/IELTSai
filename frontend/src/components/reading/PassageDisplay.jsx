// frontend/src/components/reading/PassageDisplay.jsx
import React, { useState } from 'react';
import { Card } from '../common/Card';
import { BookOpen, Highlighter, Type, ZoomIn, ZoomOut } from 'lucide-react';

export const PassageDisplay = ({ title, passageText, wordCount, topic, band }) => {
  const [fontSize, setFontSize] = useState(16); // 14, 16, 18, 20
  const [highlights, setHighlights] = useState([]);

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text && text.length > 2) {
      setHighlights(prev => [...new Set([...prev, text])]);
      selection.removeAllRanges();
    }
  };

  const clearHighlights = () => {
    setHighlights([]);
  };

  // Render passage paragraphs with highlighted terms
  const renderParagraphs = () => {
    if (!passageText) return null;
    const paragraphs = passageText.split('\n\n');

    return paragraphs.map((paragraph, pIdx) => {
      let content = paragraph;
      return (
        <p
          key={pIdx}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          className="text-slate-800 font-serif mb-4 selection:bg-amber-200"
          onMouseUp={handleHighlightSelection}
        >
          {paragraph}
        </p>
      );
    });
  };

  return (
    <Card className="border-t-4 border-t-purple-600 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title || 'Reading Passage'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold capitalize">{topic}</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">Band {band}</span>
            <span className="text-xs text-gray-500 font-mono">({wordCount} words)</span>
          </div>
        </div>

        {/* Reading Controls: Font Size & Highlighter */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFontSize(Math.max(13, fontSize - 2))}
            className="p-1.5 rounded-lg hover:bg-white text-gray-700 transition-colors"
            title="Decrease font size"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-gray-700 px-1">{fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize(Math.min(22, fontSize + 2))}
            className="p-1.5 rounded-lg hover:bg-white text-gray-700 transition-colors"
            title="Increase font size"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={handleHighlightSelection}
            className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Highlight selected text"
          >
            <Highlighter className="w-3.5 h-3.5" /> Highlight
          </button>

          {highlights.length > 0 && (
            <button
              type="button"
              onClick={clearHighlights}
              className="text-[10px] text-gray-500 hover:text-gray-800 underline px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
          <span className="font-bold text-amber-900 block">Highlighted Key Phrases ({highlights.length}):</span>
          <div className="flex flex-wrap gap-1.5">
            {highlights.map((h, idx) => (
              <span key={idx} className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-medium text-[11px]">
                "{h}"
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="prose prose-slate max-w-none">
        {renderParagraphs()}
      </div>
    </Card>
  );
};