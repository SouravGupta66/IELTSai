// frontend/src/components/writing/Task1ChartVisualizer.jsx
import React, { useState } from 'react';
import { BarChart2, TrendingUp, PieChart, Table, Info } from 'lucide-react';

export const Task1ChartVisualizer = ({ topic = 'travel', chartType = 'bar' }) => {
  const [chartMode, setChartMode] = useState(chartType || 'bar');

  // Sample data datasets based on prompt topic
  const datasets = {
    travel: {
      title: 'International Tourist Arrivals by Region (Millions)',
      categories: ['Europe', 'Asia Pacific', 'Americas', 'Middle East'],
      years: ['2010', '2015', '2020', '2025 (Projected)'],
      values: [
        [500, 600, 350, 720], // Europe
        [200, 280, 190, 410], // Asia Pacific
        [150, 190, 120, 260], // Americas
        [50, 75, 45, 110],    // Middle East
      ],
      pieData: [
        { label: 'Europe', value: 48, color: '#3B82F6' },
        { label: 'Asia Pacific', value: 27, color: '#10B981' },
        { label: 'Americas', value: 17, color: '#F59E0B' },
        { label: 'Middle East', value: 8, color: '#EC4899' },
      ],
      unit: 'Million Visitors'
    },
    technology: {
      title: 'Global Internet & Smart Device Adoption (% of Population)',
      categories: ['Smartphones', 'Laptops', 'Wearables', 'Smart Home'],
      years: ['2015', '2018', '2021', '2024'],
      values: [
        [45, 62, 78, 88], // Smartphones
        [50, 58, 65, 72], // Laptops
        [10, 22, 38, 54], // Wearables
        [5, 14, 28, 42],  // Smart Home
      ],
      pieData: [
        { label: 'Smartphones', value: 40, color: '#6366F1' },
        { label: 'Laptops', value: 30, color: '#14B8A6' },
        { label: 'Wearables', value: 18, color: '#F43F5E' },
        { label: 'Smart Home', value: 12, color: '#8B5CF6' },
      ],
      unit: '% Share'
    },
    education: {
      title: 'Higher Education Enrolment by Field of Study (Thousands)',
      categories: ['STEM', 'Business', 'Humanities', 'Medicine'],
      years: ['2012', '2016', '2020', '2024'],
      values: [
        [120, 160, 210, 290],
        [150, 175, 195, 230],
        [110, 105, 95, 88],
        [80, 95, 115, 145],
      ],
      pieData: [
        { label: 'STEM', value: 38, color: '#2563EB' },
        { label: 'Business', value: 30, color: '#059669' },
        { label: 'Medicine', value: 19, color: '#D97706' },
        { label: 'Humanities', value: 13, color: '#DC2626' },
      ],
      unit: 'Thousand Students'
    },
    work: {
      title: 'Remote vs In-Office Work Preference by Age Group (%)',
      categories: ['18-29 yrs', '30-44 yrs', '45-59 yrs', '60+ yrs'],
      years: ['Fully Remote', 'Hybrid Work', 'On-Site Office'],
      values: [
        [45, 42, 13],
        [38, 48, 14],
        [22, 40, 38],
        [12, 30, 58],
      ],
      pieData: [
        { label: 'Hybrid Work', value: 42, color: '#0284C7' },
        { label: 'Fully Remote', value: 34, color: '#16A34A' },
        { label: 'On-Site Office', value: 24, color: '#EA580C' },
      ],
      unit: '% of Workforce'
    }
  };

  const currentData = datasets[topic] || datasets.travel;
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700 space-y-4 my-4">
      {/* Chart Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/50">
            Academic IELTS Writing Task 1 Visualization
          </span>
          <h3 className="text-base font-bold text-slate-100 mt-1">
            {currentData.title}
          </h3>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartMode === 'bar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Bar
          </button>
          <button
            type="button"
            onClick={() => setChartMode('line')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartMode === 'line' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Line
          </button>
          <button
            type="button"
            onClick={() => setChartMode('pie')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartMode === 'pie' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" /> Pie
          </button>
          <button
            type="button"
            onClick={() => setChartMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" /> Table
          </button>
        </div>
      </div>

      {/* RENDER 1: BAR CHART */}
      {chartMode === 'bar' && (
        <div className="space-y-4 pt-2">
          <div className="h-56 flex items-end justify-between gap-4 px-2 pt-6 pb-2 border-b border-slate-700/60 relative">
            {/* Gridlines */}
            <div className="absolute inset-x-0 top-0 border-t border-slate-700/30 text-[9px] text-slate-500 pl-1">Max</div>
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-700/30 text-[9px] text-slate-500 pl-1">Mid</div>

            {currentData.categories.map((cat, catIdx) => (
              <div key={cat} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  {currentData.years.map((year, yrIdx) => {
                    const val = currentData.values[catIdx][yrIdx] || 20;
                    const maxVal = Math.max(...currentData.values.flat());
                    const heightPct = Math.max((val / maxVal) * 100, 10);
                    return (
                      <div
                        key={year}
                        className="flex-1 rounded-t-md transition-all duration-500 hover:opacity-90 relative group/bar"
                        style={{ height: `${heightPct}%`, backgroundColor: colors[yrIdx % colors.length] }}
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none z-20">
                          {val} {currentData.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11px] font-medium text-slate-300 mt-2 truncate w-full text-center">{cat}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            {currentData.years.map((yr, idx) => (
              <div key={yr} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-slate-300 font-medium">{yr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER 2: LINE GRAPH */}
      {chartMode === 'line' && (
        <div className="space-y-4 pt-2">
          <div className="h-56 relative border-b border-slate-700/60 flex items-end justify-between px-6 pb-2">
            <svg viewBox="0 0 400 180" className="w-full h-full overflow-visible">
              {currentData.categories.map((cat, catIdx) => {
                const maxVal = Math.max(...currentData.values.flat());
                const points = currentData.values[catIdx].map((val, yrIdx) => {
                  const x = (yrIdx / (currentData.years.length - 1)) * 360 + 20;
                  const y = 160 - (val / maxVal) * 140;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <g key={cat}>
                    <polyline
                      fill="none"
                      stroke={colors[catIdx % colors.length]}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                    {currentData.values[catIdx].map((val, yrIdx) => {
                      const x = (yrIdx / (currentData.years.length - 1)) * 360 + 20;
                      const y = 160 - (val / maxVal) * 140;
                      return (
                        <circle
                          key={yrIdx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={colors[catIdx % colors.length]}
                          stroke="#0F172A"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            {currentData.categories.map((cat, idx) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-slate-300 font-medium">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER 3: PIE CHART */}
      {chartMode === 'pie' && (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {(() => {
                let accumulated = 0;
                return currentData.pieData.map((slice) => {
                  const strokeDasharray = `${slice.value} ${100 - slice.value}`;
                  const strokeDashoffset = -accumulated;
                  accumulated += slice.value;
                  return (
                    <circle
                      key={slice.label}
                      cx="50"
                      cy="50"
                      r="15.915"
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                });
              })()}
            </svg>
          </div>
          <div className="space-y-2 text-xs">
            {currentData.pieData.map((slice) => (
              <div key={slice.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: slice.color }} />
                <span className="text-slate-200 font-semibold w-24">{slice.label}</span>
                <span className="text-indigo-300 font-mono font-bold">{slice.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER 4: DATA TABLE */}
      {chartMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase border-b border-slate-700">
              <tr>
                <th className="p-3">Category</th>
                {currentData.years.map((y) => (
                  <th key={y} className="p-3 text-right">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {currentData.categories.map((cat, idx) => (
                <tr key={cat} className="hover:bg-slate-800/50">
                  <td className="p-3 font-semibold text-slate-200">{cat}</td>
                  {currentData.values[idx].map((val, yIdx) => (
                    <td key={yIdx} className="p-3 text-right font-mono text-indigo-300 font-medium">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* IELTS Task 1 Guidance Note */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (At least 150 words).</span>
      </div>
    </div>
  );
};
