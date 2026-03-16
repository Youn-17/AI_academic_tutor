export type Role = 'student' | 'supervisor' | 'ai' | 'pending_supervisor' | 'admin';
export type Locale = 'zh-CN' | 'zh-TW' | 'en';
export type Theme = 'light' | 'dark'; // Added Theme Type

export const Role = {
  STUDENT: 'student' as Role,
  SUPERVISOR: 'supervisor' as Role,
  AI: 'ai' as Role,
  PENDING_SUPERVISOR: 'pending_supervisor' as Role,
  ADMIN: 'admin' as Role,
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
}

export interface Citation {
  id: string;
  title: string;
  author: string;
  year: number;
  source: string;
  url?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: Role;
  content: string;
  timestamp: string;
  citations?: Citation[];
  isIntervention?: boolean;
  contentType?: 'text' | 'chart' | 'image';
  chartData?: any;
}

export interface Conversation {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  lastActive: string;
  status: 'active' | 'flagged' | 'completed';
  messages: Message[];
  tags: string[];
}

export interface AnalyticData {
  name: string;
  value: number;
}
