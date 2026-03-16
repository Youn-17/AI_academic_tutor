import React, { useState, useEffect } from 'react';
import { Plus, Users, Copy, Check, School, Trash2, Calendar, MoreVertical, Edit2, X, Download } from 'lucide-react';
import * as ClassService from '@/services/ClassService';
import { Class, ClassMember } from '@/services/ClassService';
import { buildCsv, triggerDownload } from '@/lib/csvUtils';

const ClassroomView: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Edit & Delete State
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const data = await ClassService.getTeacherClasses();
      setClasses(data);
      if (data.length > 0 && !selectedClassId) {
        // Optional: Auto select first
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async (classId: string) => {
    try {
      const data = await ClassService.getClassMembers(classId);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadMembers(selectedClassId);
    } else {
      setMembers([]);
    }
  }, [selectedClassId]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await ClassService.createClass(newClassName);
      setNewClassName('');
      setIsCreating(false);
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Failed to create class');
    }
  };

  const handleUpdateClass = async (classId: string) => {
    if (!editName.trim()) return;
    try {
      await ClassService.updateClass(classId, editName);
      setEditingClassId(null);
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Failed to update class');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await ClassService.deleteClass(classId);
      if (selectedClassId === classId) setSelectedClassId(null);
      setShowDeleteConfirm(null);
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Failed to delete class');
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadClass = () => {
    if (!selectedClassId || members.length === 0) return;
    const className = classes.find(c => c.id === selectedClassId)?.name || selectedClassId;
    const rows = members.map(m => ({
      昵称: m.student_name,
      学生ID: m.student_id,
      加入时间: new Date(m.joined_at).toLocaleString('zh-CN'),
    }));
    triggerDownload(buildCsv(rows), `班级_${className}_学生名单.csv`);
  };

  return (
    <div className="flex bg-slate-50 h-full overflow-hidden">

      {/* Sidebar: Class List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 font-heading flex items-center gap-2">
            <School size={20} className="text-indigo-600" />
            我的班级
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        {isCreating && (
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in slide-in-from-top-2">
            <label className="text-xs font-bold text-indigo-900 uppercase mb-1 block">班级名称</label>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-sm"
              placeholder="例如: 2024 秋季算法课"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">取消</button>
              <button onClick={handleCreateClass} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm">创建</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {classes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm px-4">
              暂无班级，点击右上角 "+" 创建您的第一个班级。
            </div>
          ) : (
            classes.map(cls => (
              <div
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all group relative ${selectedClassId === cls.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                {editingClassId === cls.id ? (
                   <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        className="w-full px-2 py-1 text-sm border rounded"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingClassId(null)} className="text-xs text-slate-500">取消</button>
                        <button onClick={() => handleUpdateClass(cls.id)} className="text-xs text-indigo-600 font-bold">保存</button>
                      </div>
                   </div>
                ) : (
                   <>
                    <div className="flex justify-between items-start">
                        <h3 className={`font-bold text-sm ${selectedClassId === cls.id ? 'text-indigo-900' : 'text-slate-700'}`}>{cls.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClassId(cls.id);
                                    setEditName(cls.name);
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            >
                                <Edit2 size={12} />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(cls.id);
                                }}
                                className="p-1 hover:bg-rose-100 rounded text-rose-500"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                    
                    {showDeleteConfirm === cls.id ? (
                        <div className="mt-2 bg-rose-50 p-2 rounded border border-rose-100 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <p className="text-[10px] text-rose-800">确定删除? 所有数据将丢失</p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowDeleteConfirm(null)} className="text-[10px] text-slate-500">取消</button>
                                <button onClick={() => handleDeleteClass(cls.id)} className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded hover:bg-rose-600">确认删除</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1.5" title="点击复制班级ID" onClick={(e) => { e.stopPropagation(); handleCopyId(cls.id); }}>
                            ID: {cls.id.slice(0, 8)}...
                            {copiedId === cls.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="hover:text-indigo-500 cursor-pointer" />}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(cls.created_at).toLocaleDateString()}
                        </span>
                        </div>
                    )}
                   </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Class Details */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedClassId ? (
          <>
            <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-800 font-heading">{classes.find(c => c.id === selectedClassId)?.name}</h1>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  班级 ID: <span className="font-mono bg-slate-100 px-1 rounded select-all">{selectedClassId}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={18} className="text-emerald-500" />
                  <span className="font-bold">{members.length}</span> 名学生
                </div>
                {members.length > 0 && (
                  <button
                    onClick={handleDownloadClass}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    <Download size={13} /> 下载名单 CSV
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-slate-300" />
                  </div>
                  <p className="font-medium">该班级暂无学生</p>
                  <p className="text-sm mt-2 max-w-xs text-center">
                    将 <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 select-all">{selectedClassId}</span> 分享给您的学生，让他们加入班级。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map(member => (
                    <div key={member.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400">
                        {member.student_avatar ? <img src={member.student_avatar} alt="" className="w-full h-full object-cover" /> : <Users size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{member.student_name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          加入于 {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <School size={48} className="text-slate-200 mb-4" />
            <p>请选择左侧班级进行管理</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ClassroomView;
