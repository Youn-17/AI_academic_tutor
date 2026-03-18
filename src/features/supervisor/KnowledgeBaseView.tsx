import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Upload, Trash2, Search, CheckCircle, Clock, AlertCircle,
  Database, RefreshCw, Plus, X, ChevronDown, Layers, BookOpen,
  Users, Brain, Globe, GraduationCap, Sparkles, FileUp, ExternalLink,
  Info, CloudUpload
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import * as ClassService from '@/services/ClassService';
import {
  uploadToLibrary, getLibraryDocuments, deleteLibraryDocument,
  formatFileSize, validateFile, RagDoc
} from '@/services/DocumentService';

const LAYERS = [
  {
    id: 1 as const,
    label: '全局基础知识库',
    shortLabel: '层1·全局',
    icon: Globe,
    color: 'emerald',
    desc: '平台共享科研方法、写作指导、伦理规范等基础资料（管理员添加）',
    visibility: 'global' as const,
    canUpload: false,
  },
  {
    id: 3 as const,
    label: '领域文献知识库',
    shortLabel: '层3·领域',
    icon: BookOpen,
    color: 'blue',
    desc: '课程相关核心文献、综述与方法论资料（教师添加，学生可检索）',
    visibility: 'course' as const,
    canUpload: true,
  },
  {
    id: 2 as const,
    label: '学生个人知识库',
    shortLabel: '层2·个人',
    icon: Users,
    color: 'violet',
    desc: '学生自行上传的 proposal、笔记、草稿等私有资料（学生可见）',
    visibility: 'private' as const,
    canUpload: false,
  },
  {
    id: 4 as const,
    label: '过程记忆库',
    shortLabel: '层4·记忆',
    icon: Brain,
    color: 'amber',
    desc: '对话摘要、教师干预记录、研究进展摘要（系统自动生成）',
    visibility: 'private' as const,
    canUpload: false,
  },
] as const;

const STATUS_CONFIG = {
  completed: { label: '已索引', icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  processing: { label: '处理中', icon: Clock,        cls: 'text-amber-600  bg-amber-50  border-amber-100',  spin: true },
  pending:    { label: '等待中', icon: Clock,        cls: 'text-slate-500  bg-slate-50  border-slate-200' },
  failed:     { label: '失败',   icon: AlertCircle,  cls: 'text-rose-600   bg-rose-50   border-rose-100' },
};

const RESOURCE_TYPES = [
  { value: 'pdf',              label: 'PDF 文档' },
  { value: 'journal_article',  label: '期刊论文' },
  { value: 'guideline',        label: '指导材料' },
  { value: 'note',             label: '教学笔记' },
  { value: 'txt',              label: '文本文件' },
];

export default function KnowledgeBaseView() {
  const { profile } = useAuth();
  const [activeLayer, setActiveLayer] = useState<1 | 2 | 3 | 4>(3);
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadResourceType, setUploadResourceType] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const layerInfo = LAYERS.find(l => l.id === activeLayer)!;

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLibraryDocuments({ layer: activeLayer });
      setDocs(data);
      // Track processing docs for polling
      const processing = data.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending');
      if (processing.length > 0) {
        setPollingIds(new Set(processing.map(d => d.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeLayer]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  useEffect(() => {
    ClassService.getTeacherClasses().then(cls =>
      setMyClasses(cls.map(c => ({ id: c.id, name: c.name })))
    ).catch(() => {});
  }, []);

  // Poll processing documents
  useEffect(() => {
    if (pollingIds.size === 0) return;
    const iv = setInterval(async () => {
      const updated = await getLibraryDocuments({ layer: activeLayer }).catch(() => []);
      setDocs(updated);
      const stillProcessing = updated.filter(d =>
        pollingIds.has(d.id) && (d.processing_status === 'processing' || d.processing_status === 'pending')
      );
      if (stillProcessing.length === 0) {
        setPollingIds(new Set());
        clearInterval(iv);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [pollingIds, activeLayer]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFileFromPicker(f);
  };

  const setFileFromPicker = (f: File) => {
    const v = validateFile(f);
    if (!v.valid) { setUploadMsg({ type: 'err', text: v.error! }); return; }
    setUploadFile(f);
    setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    setUploadMsg(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const doc = await uploadToLibrary(uploadFile, {
        title: uploadTitle || uploadFile.name,
        layer: 3,
        visibility: uploadCourseId ? 'course' : 'global',
        course_id: uploadCourseId || undefined,
        resource_type: uploadResourceType,
      });
      setDocs(prev => [doc, ...prev]);
      setPollingIds(prev => new Set([...prev, doc.id]));
      setUploadFile(null);
      setUploadTitle('');
      setUploadCourseId('');
      setShowUpload(false);
      setUploadMsg({ type: 'ok', text: '上传成功，正在向量化处理…' });
    } catch (e: unknown) {
      setUploadMsg({ type: 'err', text: (e as Error).message || '上传失败' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此文档？相关向量索引也将被删除。')) return;
    await deleteLibraryDocument(id).catch(console.error);
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const filtered = docs.filter(d =>
    !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: docs.length,
    indexed: docs.filter(d => d.processing_status === 'completed').length,
    processing: docs.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending').length,
    chunks: docs.reduce((s, d) => s + (d.chunk_count || 0), 0),
  };

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
  };

  const iconBgMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue:    'bg-blue-500/10 text-blue-600',
    violet:  'bg-violet-500/10 text-violet-600',
    amber:   'bg-amber-500/10 text-amber-600',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Database size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">知识库管理</h1>
              <p className="text-xs text-slate-400 mt-0.5">RAG 分层知识系统 · 权限驱动检索</p>
            </div>
          </div>
          <button onClick={loadDocs} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '文档总数', value: stats.total },
            { label: '已向量化', value: stats.indexed },
            { label: '处理中', value: stats.processing },
            { label: '知识块数', value: stats.chunks },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Layer tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1">
          {LAYERS.map(l => {
            const Icon = l.icon;
            const active = activeLayer === l.id;
            return (
              <button key={l.id} onClick={() => { setActiveLayer(l.id); setSearchTerm(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? `bg-${l.color}-500 text-white shadow-sm shadow-${l.color}-500/20`
                    : 'text-slate-500 hover:bg-slate-50'
                }`}>
                <Icon size={12} />
                <span className="hidden sm:inline">{l.shortLabel}</span>
                <span className="sm:hidden">{l.id}</span>
              </button>
            );
          })}
        </div>

        {/* Layer info banner */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${colorMap[layerInfo.color]}`}>
          <Info size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold mb-0.5">{layerInfo.label}</p>
            <p className="text-xs opacity-80">{layerInfo.desc}</p>
          </div>
          {layerInfo.canUpload && (
            <button onClick={() => setShowUpload(true)}
              className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-current/20 rounded-lg text-xs font-semibold hover:bg-white transition-all shadow-sm">
              <Plus size={12} /> 添加文献
            </button>
          )}
        </div>

        {/* Upload panel */}
        {showUpload && layerInfo.canUpload && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload size={16} className="text-blue-500" />
                <span className="font-bold text-slate-800 text-sm">上传领域文献</span>
              </div>
              <button onClick={() => setShowUpload(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue-400 bg-blue-50' : uploadFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}>
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".pdf,.txt,.md,.doc,.docx,.csv,.json"
                  onChange={e => e.target.files?.[0] && setFileFromPicker(e.target.files[0])} />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileText size={20} className="text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">{uploadFile.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setUploadFile(null); setUploadTitle(''); }}
                      className="ml-2 text-slate-300 hover:text-rose-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <FileUp size={28} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-600">拖拽文件到这里，或点击选择</p>
                    <p className="text-xs text-slate-400 mt-1">支持 PDF · TXT · MD · DOCX（最大 10MB）</p>
                  </>
                )}
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">文档标题</label>
                  <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                    placeholder="文献标题" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">文档类型</label>
                  <select value={uploadResourceType} onChange={e => setUploadResourceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                    {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">关联班级（可选）</label>
                <select value={uploadCourseId} onChange={e => setUploadCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                  <option value="">所有班级可见</option>
                  {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {uploadMsg && (
                <p className={`text-sm font-medium ${uploadMsg.type === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {uploadMsg.text}
                </p>
              )}

              <button onClick={handleUpload} disabled={!uploadFile || uploading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20">
                {uploading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 上传中…</>
                  : <><Upload size={15} /> 上传并向量化</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Document list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索文档…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} 份文档</span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">加载中…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <div className={`w-14 h-14 rounded-2xl ${iconBgMap[layerInfo.color]} flex items-center justify-center`}>
                {React.createElement(layerInfo.icon, { size: 24 })}
              </div>
              <p className="text-sm font-semibold text-slate-500">暂无文档</p>
              <p className="text-xs text-slate-400">
                {layerInfo.canUpload ? '点击「添加文献」上传第一份文档' : '此层的文档将在这里显示'}
              </p>
              {layerInfo.canUpload && (
                <button onClick={() => setShowUpload(true)}
                  className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-all shadow-sm">
                  <Plus size={14} /> 添加文献
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(doc => {
                const st = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.pending;
                const StIcon = st.icon;
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-slate-500" />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{doc.resource_type}</span>
                        {doc.file_size && <><span>·</span><span>{formatFileSize(doc.file_size)}</span></>}
                        {doc.chunk_count > 0 && <><span>·</span><span className="text-emerald-600 font-semibold">{doc.chunk_count} 块</span></>}
                        <span>·</span>
                        <span>{new Date(doc.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${st.cls} shrink-0`}>
                      <StIcon size={10} className={(st as any).spin ? 'animate-spin' : ''} />
                      {st.label}
                    </span>

                    {/* Delete */}
                    <button onClick={() => handleDelete(doc.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="flex items-start gap-2.5 p-4 bg-slate-100 rounded-xl text-xs text-slate-500">
          <Sparkles size={13} className="text-emerald-500 shrink-0 mt-0.5" />
          <p>
            文档上传后自动进行文本切块与向量嵌入（embedding），处理完成后学生发起 AI 对话时可启用 RAG 模式检索相关内容。
            文本/MD 文件实时处理；PDF/DOCX 需要服务端解析，请稍等。
          </p>
        </div>
      </div>
    </div>
  );
}
