import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, Maximize2, MoreHorizontal } from 'lucide-react';

interface GeneratedChartProps {
    data: any;
    title: string;
    type: 'line' | 'area';
}

const GeneratedChart: React.FC<GeneratedChartProps> = ({ data, title, type }) => {
    return (
        <div className="w-full bg-white rounded-xl border border-secondary/20 shadow-sm overflow-hidden my-2 group">
            {/* Chart Header */}
            <div className="px-4 py-3 border-b border-secondary/10 flex justify-between items-center bg-secondary/5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse-slow"></div>
                    <span className="font-heading font-semibold text-sm text-primary">{title}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-white rounded-md text-secondary-light hover:text-primary transition-colors border border-transparent hover:border-secondary/20">
                        <Download size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-white rounded-md text-secondary-light hover:text-primary transition-colors border border-transparent hover:border-secondary/20">
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-[250px] w-full p-4 relative">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'area' ? (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px'
                                }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    ) : (
                        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px'
                                }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-secondary/5 border-t border-secondary/10 text-[10px] text-secondary-light flex justify-between items-center font-mono">
                <span>Generated by DataAnalyst-v2</span>
                <span>Confidence: 98.2%</span>
            </div>
        </div>
    );
};

export default GeneratedChart;
