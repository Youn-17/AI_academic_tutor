import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Database,
  Link as LinkIcon
} from 'lucide-react';
import { aiService, RagDocument } from '@/services/AIService';

const KnowledgeBaseView: React.FC = () => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadType, setUploadType] = useState<'pdf' | 'url'>('pdf');

  useEffect(() => {
    // Load initial documents
    setDocuments(aiService.getDocuments());
  }, []);

  const handleUpload = async () => {
    setIsUploading(true);
    // Simulate file selection/input
    const mockFile = uploadType === 'pdf' 
      ? `Lecture_Notes_Week_${Math.floor(Math.random() * 10) + 1}.pdf` 
      : 'https://scholar.google.com/article_new';
      
    const newDoc = await aiService.uploadDocument(mockFile, uploadType);
    
    // Refresh list
    setDocuments([...aiService.getDocuments()]);
    setIsUploading(false);

    // Poll for status change (simulated in service, but we need to refresh UI)
    if (newDoc.status === 'processing') {
      setTimeout(() => {
        setDocuments([...aiService.getDocuments()]);
      }, 2500);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-primary-bg scroll-smooth">
       <div className="mb-8 border-b border-cyan-200/50 pb-4">
          <h1 className="text-3xl font-serif font-bold text-primary-dark tracking-tight flex items-center gap-3">
            <Database className="text-primary" />
            知识库管理 (RAG)
          </h1>
          <p className="text-cyan-600 mt-2 text-sm">
             管理用于 AI 检索增强生成 (RAG) 的参考文档与数据源。系统将自动对上传的内容进行切片与向量化。
          </p>
       </div>

       {/* Stats / Upload Area */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100 flex flex-col justify-between group hover:shadow-md transition-all">
             <div>
               <h3 className="text-secondary-DEFAULT font-medium text-sm mb-2">已索引文档</h3>
               <p className="text-4xl font-bold text-primary-dark font-serif">{documents.filter(d => d.status === 'indexed').length}</p>
             </div>
             <div className="mt-4 flex items-center gap-2 text-xs text-secondary-light">
               <CheckCircle size={14} className="text-success" />
               系统运行正常
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-cyan-100 md:col-span-2 flex flex-col justify-center">
             <h3 className="text-primary-dark font-bold mb-4 font-serif">快速添加知识</h3>
             <div className="flex gap-4 items-center">
                <div className="flex bg-cyan-50 p-1 rounded-lg border border-cyan-100">
                   <button 
                     onClick={() => setUploadType('pdf')}
                     className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${uploadType === 'pdf' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                   >
                     <div className="flex items-center gap-2">
                       <FileText size={16} /> 上传文档
                     </div>
                   </button>
                   <button 
                     onClick={() => setUploadType('url')}
                     className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${uploadType === 'url' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                   >
                     <div className="flex items-center gap-2">
                       <LinkIcon size={16} /> 添加链接
                     </div>
                   </button>
                </div>
                
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-serif"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {uploadType === 'pdf' ? '上传并索引' : '抓取并索引'}
                    </>
                  )}
                </button>
             </div>
          </div>
       </div>

       {/* Document List */}
       <div className="bg-white rounded-xl shadow-sm border border-cyan-100 overflow-hidden">
          <div className="p-4 border-b border-cyan-100 flex justify-between items-center bg-cyan-50/30">
             <h3 className="font-bold text-primary-dark font-serif flex items-center gap-2">
               <FileText size={18} className="text-secondary" />
               文档列表
             </h3>
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-cyan-400" size={16} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索文档..." 
                  className="pl-9 pr-4 py-2 bg-white border border-cyan-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-primary-dark w-64"
                />
             </div>
          </div>
          
          <div className="divide-y divide-cyan-100">
             {filteredDocs.length > 0 ? filteredDocs.map(doc => (
               <div key={doc.id} className="p-4 hover:bg-cyan-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-lg ${doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {doc.type === 'pdf' ? <FileText size={20} /> : <LinkIcon size={20} />}
                     </div>
                     <div>
                        <h4 className="font-bold text-primary-dark text-sm mb-1">{doc.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-secondary-light">
                           <span>ID: {doc.id}</span>
                           <span>•</span>
                           <span>{doc.uploadDate}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                        {doc.status === 'indexed' && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                             <CheckCircle size={12} /> 已索引
                          </span>
                        )}
                        {doc.status === 'processing' && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                             <Clock size={12} className="animate-spin" /> 处理中
                          </span>
                        )}
                        {doc.status === 'error' && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                             <AlertCircle size={12} /> 失败
                          </span>
                        )}
                     </div>
                     
                     <button className="text-gray-300 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                     </button>
                  </div>
               </div>
             )) : (
               <div className="p-12 text-center text-secondary-light">
                  <p>未找到匹配的文档</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default KnowledgeBaseView;
