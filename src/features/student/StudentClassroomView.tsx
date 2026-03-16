import React, { useState, useEffect } from 'react';
import { Plus, Users, School, ArrowRight, Loader2 } from 'lucide-react';
import * as ClassService from '@/services/ClassService';
import { Class } from '@/services/ClassService';

const StudentClassroomView: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [joinId, setJoinId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await ClassService.getMyClasses();
      setClasses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinId.trim()) return;
    try {
      setIsJoining(true);
      await ClassService.joinClass(joinId.trim());
      setJoinId('');
      await loadClasses();
      alert('成功加入班级');
    } catch (err) {
      console.error(err);
      alert('加入班级失败：请检查 ID 是否正确');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 h-full font-sans">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900">我的班级</h1>
            <p className="text-slate-500 text-sm mt-1">查看已加入的课程与班级信息</p>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-slate-400">
            <School size={20} />
          </div>
        </header>

        {/* Join Section */}
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600" />
            加入新班级
          </h2>
          <div className="flex gap-4">
            <input
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="请输入班级 ID (Class ID)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button
              onClick={handleJoinClass}
              disabled={isJoining || !joinId.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
              加入
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">请向您的讲师获取班级 ID</p>
        </div>

        {/* Class List */}
        <div>
          <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">已加入 ({classes.length})</h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
              <School size={48} className="mx-auto mb-4 opacity-50 text-slate-300" />
              <p>您尚未加入任何班级</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(cls => (
                <div key={cls.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 font-heading group-hover:text-indigo-600 transition-colors">{cls.name}</h3>
                    <School size={16} className="text-slate-300" />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Class ID: <span className="font-mono bg-slate-50 px-1 rounded">{cls.id.slice(0, 8)}...</span></p>
                    <p>教师 ID: <span className="font-mono bg-slate-50 px-1 rounded">{cls.teacher_id.slice(0, 8)}...</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentClassroomView;
