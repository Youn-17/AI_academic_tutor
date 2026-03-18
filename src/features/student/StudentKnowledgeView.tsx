import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';
import KnowledgeGraph from './components/KnowledgeGraph';
import {
    Network, Library, Upload, FileText, Trash2, RefreshCw,
    Search, BookOpen, Globe, User, Database, Layers,
    CheckCircle, Clock, AlertCircle, ChevronRight, X,
    File, BookMarked, BarChart3
} from 'lucide-react';
import * as ConversationService from '@/services/ConversationService';
import {
    getLibraryDocuments, deleteLibraryDocument, uploadToLibrary,
    RagDoc, formatFileSize, SUPPORTED_FILE_TYPES, SUPPORTED_MIME_TYPES
} from '@/services/DocumentService';

interface StudentKnowledgeViewProps {
    theme: 'light' | 'dark';
}

type MainTab = 'graph' | 'library';
type LibraryLayer = 'all' | 'personal' | 'global' | 'domain';

const STATUS_ICON = {
    completed: <CheckCircle size={13} className="text-emerald-500" />,
    processing: <RefreshCw size={13} className="text-blue-400 animate-spin" />,
    pending: <Clock size={13} className="text-amber-400" />,
    failed: <AlertCircle size={13} className="text-red-400" />,
};
const STATUS_LABEL: Record<string, string> = {
    completed: '已索引',
    processing: '处理中',
    pending: '待处理',
    failed: '失败',
};

const LAYER_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    all:      { label: '全部文档', color: 'bg-slate-500',  icon: <Layers size={13} /> },
    personal: { label: '我的文档', color: 'bg-emerald-600', icon: <User size={13} /> },
    global:   { label: '全局知识库', color: 'bg-violet-600', icon: <Globe size={13} /> },
    domain:   { label: '课程资料', color: 'bg-blue-600',   icon: <BookOpen size={13} /> },
};

const StudentKnowledgeView: React.FC<StudentKnowledgeViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';

    /* ── tabs ── */
    const [mainTab, setMainTab] = useState<MainTab>('library');
    const [libraryLayer, setLibraryLayer] = useState<LibraryLayer>('all');

    /* ── knowledge graph ── */
    const [messages, setMessages] = useState<Message[]>([]);
    const [graphLoading, setGraphLoading] = useState(false);

    /* ── library ── */
    const [docs, setDocs] = useState<RagDoc[]>([]);
    const [libLoading, setLibLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── poll for processing docs ── */
    const pollRef = useRef<number | null>(null);

    const loadDocs = useCallback(async () => {
        try {
            const all = await getLibraryDocuments();
            setDocs(all);
        } catch (e) {
            console.error(e);
        } finally {
            setLibLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    useEffect(() => {
        const hasProcessing = docs.some(d => d.processing_status === 'processing' || d.processing_status === 'pending');
        if (hasProcessing && !pollRef.current) {
            pollRef.current = window.setInterval(loadDocs, 3000);
        } else if (!hasProcessing && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [docs, loadDocs]);

    /* ── load graph messages ── */
    const loadGraph = useCallback(async () => {
        setGraphLoading(true);
        try {
            const convs = await ConversationService.getConversations();
            if (convs.length > 0) {
                const msgs = await ConversationService.getMessages(convs[0].id);
                setMessages(msgs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGraphLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mainTab === 'graph' && messages.length === 0) {
            loadGraph();
        }
    }, [mainTab, loadGraph, messages.length]);

    /* ── upload ── */
    const handleUpload = async (files: FileList | File[]) => {
        const fileArr = Array.from(files);
        if (fileArr.length === 0) return;
        setUploading(true);
        setUploadError('');
        try {
            for (const file of fileArr) {
                await uploadToLibrary(file, { layer: 2, visibility: 'private' });
            }
            await loadDocs();
        } catch (e: any) {
            setUploadError(e?.message || '上传失败');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('删除该文档将同时删除其索引块，确认吗？')) return;
        try {
            await deleteLibraryDocument(id);
            setDocs(prev => prev.filter(d => d.id !== id));
        } catch (e: any) {
            alert(e?.message || '删除失败');
        }
    };

    /* ── filtered docs ── */
    const filteredDocs = docs.filter(d => {
        const matchLayer =
            libraryLayer === 'all' ? true :
            libraryLayer === 'personal' ? d.layer === 2 :
            libraryLayer === 'global' ? d.layer === 1 :
            d.layer === 3;
        const matchQuery = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchLayer && matchQuery;
    });

    /* ── stats ── */
    const totalDocs = docs.length;
    const indexedDocs = docs.filter(d => d.processing_status === 'completed').length;
    const processingDocs = docs.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending').length;
    const totalChunks = docs.reduce((a, d) => a + (d.chunk_count || 0), 0);

    /* ── styles ── */
    const bg = isDark ? 'bg-[#0B101E]' : 'bg-slate-50';
    const headerBg = isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200';
    const cardBg = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const text = isDark ? 'text-slate-100' : 'text-slate-800';

    return (
        <div className={`flex flex-col h-full overflow-hidden ${bg}`}>

            {/* ── Header ── */}
            <header className={`h-14 px-6 flex items-center justify-between border-b ${headerBg} flex-shrink-0`}>
                <div className="flex items-center gap-2">
                    {/* Tab switcher */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button
                            onClick={() => setMainTab('library')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                mainTab === 'library'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : `${subText} hover:${text}`
                            }`}
                        >
                            <Library size={14} />
                            知识库
                        </button>
                        <button
                            onClick={() => setMainTab('graph')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                mainTab === 'graph'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : `${subText} hover:${text}`
                            }`}
                        >
                            <Network size={14} />
                            知识图谱
                        </button>
                    </div>
                </div>

                {mainTab === 'library' && (
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <Search size={13} className={subText} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索文档..."
                                className="bg-transparent border-none outline-none w-36 text-sm"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')}>
                                    <X size={12} className={subText} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                            上传文档
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={SUPPORTED_FILE_TYPES.join(',')}
                            className="hidden"
                            onChange={e => e.target.files && handleUpload(e.target.files)}
                        />
                    </div>
                )}

                {mainTab === 'graph' && (
                    <div className={`text-xs ${subText}`}>
                        基于对话内容自动生成
                    </div>
                )}
            </header>

            {/* ── Library View ── */}
            {mainTab === 'library' && (
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Stats row */}
                    <div className={`px-6 py-3 flex items-center gap-4 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        {[
                            { label: '文档总数', value: totalDocs, icon: <FileText size={13} />, color: 'text-slate-400' },
                            { label: '已索引', value: indexedDocs, icon: <CheckCircle size={13} />, color: 'text-emerald-500' },
                            { label: '处理中', value: processingDocs, icon: <RefreshCw size={13} />, color: 'text-blue-400' },
                            { label: '知识块', value: totalChunks, icon: <Database size={13} />, color: 'text-violet-400' },
                        ].map(stat => (
                            <div key={stat.label} className="flex items-center gap-2">
                                <span className={stat.color}>{stat.icon}</span>
                                <span className={`text-sm font-bold font-mono ${text}`}>{stat.value}</span>
                                <span className={`text-xs ${subText}`}>{stat.label}</span>
                                <span className={`text-xs ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>·</span>
                            </div>
                        ))}
                    </div>

                    {/* Layer tabs */}
                    <div className={`px-6 py-2 flex items-center gap-2 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        {(Object.entries(LAYER_META) as [LibraryLayer, typeof LAYER_META[string]][]).map(([key, meta]) => (
                            <button
                                key={key}
                                onClick={() => setLibraryLayer(key)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                    libraryLayer === key
                                        ? `${meta.color} text-white border-transparent`
                                        : `${isDark ? 'border-slate-700 text-slate-400 hover:border-slate-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`
                                }`}
                            >
                                {meta.icon}
                                {meta.label}
                                <span className={`text-xs px-1 rounded-full ${libraryLayer === key ? 'bg-white/20' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    {key === 'all' ? docs.length
                                        : key === 'personal' ? docs.filter(d => d.layer === 2).length
                                        : key === 'global' ? docs.filter(d => d.layer === 1).length
                                        : docs.filter(d => d.layer === 3).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Upload drop zone — only for personal layer */}
                    {(libraryLayer === 'personal' || libraryLayer === 'all') && (
                        <div
                            className={`mx-6 mt-4 mb-2 flex-shrink-0 border-2 border-dashed rounded-xl p-4 flex items-center gap-4 transition-all cursor-pointer ${
                                dragOver
                                    ? 'border-emerald-500 bg-emerald-500/5'
                                    : isDark ? 'border-slate-700 hover:border-emerald-700' : 'border-slate-200 hover:border-emerald-400'
                            }`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <Upload size={18} className="text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-sm font-medium ${text}`}>
                                    {uploading ? '正在上传...' : '拖拽或点击上传个人文档'}
                                </p>
                                <p className={`text-xs ${subText} mt-0.5`}>
                                    支持 {SUPPORTED_FILE_TYPES.join(' ')}，最大 10MB。上传后自动建立向量索引。
                                </p>
                                {uploadError && (
                                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                        <AlertCircle size={11} /> {uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Document list */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        {libLoading ? (
                            <div className={`flex flex-col items-center justify-center py-16 ${subText}`}>
                                <RefreshCw size={24} className="animate-spin mb-3" />
                                <p className="text-sm">加载中...</p>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center py-16 ${subText}`}>
                                <BookMarked size={32} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">
                                    {searchQuery ? '没有匹配的文档' : '暂无文档'}
                                </p>
                                <p className="text-xs mt-1 opacity-70">
                                    {libraryLayer === 'personal' || libraryLayer === 'all'
                                        ? '上传文档后，AI 将基于文档内容回答问题'
                                        : '该分类暂无文档'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 mt-3">
                                {filteredDocs.map(doc => (
                                    <DocRow
                                        key={doc.id}
                                        doc={doc}
                                        onDelete={handleDelete}
                                        isDark={isDark}
                                        text={text}
                                        subText={subText}
                                        cardBg={cardBg}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Knowledge Graph View ── */}
            {mainTab === 'graph' && (
                <div className="flex-1 relative overflow-hidden">
                    {graphLoading ? (
                        <div className={`flex flex-col items-center justify-center h-full ${subText}`}>
                            <RefreshCw size={24} className="animate-spin mb-3" />
                            <p className="text-sm">生成知识图谱中...</p>
                        </div>
                    ) : (
                        <div className="w-full h-full">
                            <KnowledgeGraph messages={messages} theme={theme} />

                            {/* Floating insight card */}
                            <div className={`absolute bottom-6 right-6 p-4 rounded-2xl border backdrop-blur-md shadow-xl ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 size={14} className="text-emerald-500" />
                                    <span className={`text-xs font-bold uppercase ${subText}`}>图谱洞察</span>
                                </div>
                                <div className={`text-2xl font-bold font-mono ${text}`}>
                                    {messages.reduce((acc, m) => acc + (m.content.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{5,}/g) || []).length, 0)}
                                </div>
                                <div className={`text-xs ${subText}`}>已识别知识节点</div>
                                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <div className={`text-xs ${subText}`}>{messages.length} 条对话消息</div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className={`absolute top-4 left-4 p-3 rounded-xl border backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
                                <p className={`text-xs font-semibold mb-2 ${subText}`}>节点类型</p>
                                {[
                                    { color: '#10b981', label: '核心概念' },
                                    { color: '#6366f1', label: '问题节点' },
                                    { color: '#f59e0b', label: '知识点' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-2 mb-1">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                        <span className={`text-xs ${subText}`}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── DocRow sub-component ── */
interface DocRowProps {
    doc: RagDoc;
    onDelete: (id: string) => void;
    isDark: boolean;
    text: string;
    subText: string;
    cardBg: string;
}

const LAYER_COLOR: Record<number, string> = {
    1: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    2: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    3: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    4: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const LAYER_NAME: Record<number, string> = {
    1: '全局',
    2: '个人',
    3: '课程',
    4: '训练',
};

const DocRow: React.FC<DocRowProps> = ({ doc, onDelete, isDark, text, subText, cardBg }) => {
    const ext = doc.title.split('.').pop()?.toUpperCase() || 'DOC';
    const layerColor = LAYER_COLOR[doc.layer] || LAYER_COLOR[2];
    const layerName = LAYER_NAME[doc.layer] || '文档';

    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${cardBg} hover:border-emerald-500/30`}>
            {/* File icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <FileText size={16} className="text-emerald-500" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${text}`}>{doc.title}</p>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full border ${layerColor}`}>{layerName}</span>
                </div>
                <div className={`flex items-center gap-2 mt-0.5 text-xs ${subText}`}>
                    <span className="flex items-center gap-1">
                        {STATUS_ICON[doc.processing_status]}
                        {STATUS_LABEL[doc.processing_status]}
                    </span>
                    {doc.chunk_count > 0 && (
                        <>
                            <span>·</span>
                            <span>{doc.chunk_count} 块</span>
                        </>
                    )}
                    {doc.file_size && (
                        <>
                            <span>·</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                        </>
                    )}
                    <span>·</span>
                    <span>{new Date(doc.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.layer === 2 && (
                    <button
                        onClick={() => onDelete(doc.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="删除"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default StudentKnowledgeView;
