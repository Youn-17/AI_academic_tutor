import { Conversation, Message, Role, Citation, Poll } from '@/types';
import { INITIAL_CHATS } from '@/constants';
import { aiService } from '@/services/AIService'; // Import AIService

// Simulated latency helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockBackendService {
  private conversations: Conversation[];
  private polls: Poll[] = [];
  private listeners: ((chats: Conversation[]) => void)[] = [];
  private pollListeners: ((polls: Poll[]) => void)[] = [];

  constructor() {
    // Initialize with mock data
    this.conversations = JSON.parse(JSON.stringify(INITIAL_CHATS));
    
    // Init some mock polls
    this.polls = [
       {
         id: 'p1',
         question: '大家对这节课提到的 TPACK 框架掌握程度如何？',
         options: [
            { id: '1', text: '非常清楚', votes: 12 },
            { id: '2', text: '基本理解', votes: 8 },
            { id: '3', text: '有些模糊', votes: 3 }
         ],
         isActive: true,
         createdAt: new Date().toISOString()
       }
    ];
  }

  // Subscribe to changes (Observer pattern)
  subscribe(listener: (chats: Conversation[]) => void) {
    this.listeners.push(listener);
    listener(this.conversations);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  subscribePolls(listener: (polls: Poll[]) => void) {
    this.pollListeners.push(listener);
    listener(this.polls);
    return () => {
      this.pollListeners = this.pollListeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.conversations));
  }

  private notifyPolls() {
    this.pollListeners.forEach(l => l(this.polls));
  }

  createPoll(question: string, options: string[]) {
    const newPoll: Poll = {
      id: Date.now().toString(),
      question,
      options: options.map((opt, idx) => ({ id: idx.toString(), text: opt, votes: 0 })),
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.polls = [newPoll, ...this.polls];
    this.notifyPolls();
  }

  togglePollStatus(pollId: string) {
    this.polls = this.polls.map(p => 
      p.id === pollId ? { ...p, isActive: !p.isActive } : p
    );
    this.notifyPolls();
  }

  votePoll(pollId: string, optionId: string) {
     this.polls = this.polls.map(p => {
        if (p.id === pollId && p.isActive) {
           return {
             ...p,
             options: p.options.map(opt => 
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
             )
           };
        }
        return p;
     });
     this.notifyPolls();
  }

  getConversations() {
    return this.conversations;
  }

  getConversation(id: string) {
    return this.conversations.find(c => c.id === id);
  }

  // Simulate Student sending a message
  async sendStudentMessage(chatId: string, content: string): Promise<void> {
    this.addMessage(chatId, {
      id: Date.now().toString(),
      sender: Role.STUDENT,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Simulate AI Processing
    await this.simulateAIResponse(chatId, content);
  }

  // Simulate Supervisor Intervention
  sendSupervisorMessage(chatId: string, content: string) {
    this.addMessage(chatId, {
      id: Date.now().toString(),
      sender: Role.SUPERVISOR,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isIntervention: true
    });
  }

  toggleFlag(chatId: string) {
    this.conversations = this.conversations.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          status: chat.status === 'flagged' ? 'active' : 'flagged'
        };
      }
      return chat;
    });
    this.notify();
  }

  private addMessage(chatId: string, message: Message) {
    this.conversations = this.conversations.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, message],
          lastActive: '刚刚',
          // If student sent it, reset unread for supervisor (logic can vary)
        };
      }
      return chat;
    });
    this.notify();
  }

  // Rudimentary "AI" Logic for EdTech Domain
  private async simulateAIResponse(chatId: string, userContent: string) {
    // 1. Thinking state (optional UI handling, here we just wait)
    await delay(1500); 

    // Use dedicated AI Service for RAG logic
    const conversation = this.getConversation(chatId);
    if (!conversation) return;

    const response = await aiService.generateResponse(userContent, conversation);

    this.addMessage(chatId, {
      id: (Date.now() + 1).toString(),
      sender: Role.AI,
      content: response.content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: response.citations
    });
  }
}

// Export Singleton
export const mockBackend = new MockBackendService();