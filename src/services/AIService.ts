import { Citation, Conversation } from '@/types';

// RAG Document Interface
export interface RagDocument {
  id: string;
  title: string;
  type: 'pdf' | 'url' | 'text';
  content: string; // Simulated content or summary
  uploadDate: string;
  status: 'indexed' | 'processing' | 'error';
}

// RAG Search Result Interface
export interface RagSearchResult {
  documentId: string;
  score: number;
  content: string;
  metadata: {
    title: string;
    author?: string;
    year?: string;
    source?: string;
  };
}

export interface AIServiceResponse {
  content: string;
  citations: Citation[];
}

// Mock Data for Knowledge Base
const MOCK_KNOWLEDGE_BASE: RagDocument[] = [
  {
    id: 'doc1',
    title: 'The Systematic Design of Instruction (Dick & Carey)',
    type: 'pdf',
    content: 'Instructional design model focusing on systems approach...',
    uploadDate: '2024-01-15',
    status: 'indexed'
  },
  {
    id: 'doc2',
    title: 'Cognitive Load Theory (Sweller)',
    type: 'pdf',
    content: 'Theory about human cognitive architecture and instructional design...',
    uploadDate: '2024-01-20',
    status: 'indexed'
  },
  {
    id: 'doc3',
    title: 'Learning Analytics Review 2023',
    type: 'url',
    content: 'Comprehensive review of learning analytics adoption in higher ed...',
    uploadDate: '2024-02-01',
    status: 'indexed'
  }
];

// Mock AI Service Implementation
export class MockAIService {
  private knowledgeBase: RagDocument[] = [...MOCK_KNOWLEDGE_BASE];

  // Simulate "uploading" a document
  async uploadDocument(file: File | string, type: 'pdf' | 'url'): Promise<RagDocument> {
    const newDoc: RagDocument = {
      id: `doc-${Date.now()}`,
      title: typeof file === 'string' ? file : file.name,
      type,
      content: 'Simulated content extraction...',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'processing'
    };
    
    this.knowledgeBase.push(newDoc);
    
    // Simulate processing delay
    setTimeout(() => {
      newDoc.status = 'indexed';
    }, 2000);

    return newDoc;
  }

  getDocuments(): RagDocument[] {
    return this.knowledgeBase;
  }

  // Simulate RAG Retrieval
  private async retrieveContext(query: string): Promise<RagSearchResult[]> {
    // Simple keyword matching simulation
    const results: RagSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('教学设计') || lowerQuery.includes('addie') || lowerQuery.includes('design')) {
      results.push({
        documentId: 'doc1',
        score: 0.95,
        content: 'Dick & Carey Model emphasizes formative evaluation...',
        metadata: { title: 'The Systematic Design of Instruction', author: 'Dick, W., & Carey, L.', year: '2015', source: 'Pearson' }
      });
    }

    if (lowerQuery.includes('认知负荷') || lowerQuery.includes('load') || lowerQuery.includes('cognitive')) {
      results.push({
        documentId: 'doc2',
        score: 0.92,
        content: 'Cognitive Load Theory suggests reducing extraneous load...',
        metadata: { title: 'Cognitive Load Theory', author: 'Sweller, J.', year: '2011', source: 'Springer' }
      });
    }

    if (lowerQuery.includes('数据') || lowerQuery.includes('analytics')) {
      results.push({
        documentId: 'doc3',
        score: 0.88,
        content: 'Learning Analytics uses data to improve learning...',
        metadata: { title: 'Learning Analytics Review', author: 'Siemens, G.', year: '2013', source: 'LAK' }
      });
    }

    // Default fallback
    if (results.length === 0) {
       results.push({
        documentId: 'doc-tpack',
        score: 0.85,
        content: 'TPACK framework integrates technology, pedagogy, and content knowledge...',
        metadata: { title: 'TPACK Framework', author: 'Mishra & Koehler', year: '2006', source: 'TCR' }
      });
    }

    return results;
  }

  // Simulate LLM Generation with Context
  async generateResponse(query: string, context: Conversation): Promise<AIServiceResponse> {
    const retrievedDocs = await this.retrieveContext(query);
    
    // Construct Citations from Retrieval
    const citations: Citation[] = retrievedDocs.map((doc, index) => ({
      id: `cit-${Date.now()}-${index}`,
      title: doc.metadata.title,
      author: doc.metadata.author || 'Unknown',
      year: doc.metadata.year || 'n.d.',
      source: doc.metadata.source || 'Knowledge Base',
      url: '#'
    }));

    // Construct Response Content (Mock LLM)
    let content = '';
    
    if (query.includes('教学设计') || query.includes('ADDIE')) {
      content = `关于 **教学设计**，建议你不仅关注 ADDIE 模型的线性流程，也要考虑 Dick & Carey 模型中的形成性评价环节。
\n### 核心建议
1. **目标人群分析**：在您的研究情境中，目标人群的特征（如前置知识、学习风格）是决定设计成败的关键。
2. **评价环节**：尝试在设计的每个阶段都引入*形成性评价*，而非仅在最后进行总结性评价。
\n> "教学设计不仅仅是流程的堆砌，更是对学习体验的系统化编排。"`;
    } else if (query.includes('认知负荷') || query.includes('困难')) {
      content = `**认知负荷理论 (CLT)** 指出，我们应当尽量减少外在认知负荷，优化内在认知负荷。
\n您可以尝试以下策略：
* **多媒体呈现原则**：
  * *邻近原则*：将相关的文字和图片靠近放置。
  * *连贯原则*：剔除无关的背景音乐或装饰性图片。
* **通道效应**：同时利用视觉和听觉通道分担信息处理压力。`;
    } else if (query.includes('数据') || query.includes('量化')) {
      content = `数据分析方面，对于教育场景下的多模态数据，目前学界比较推崇使用 **学习分析技术 (Learning Analytics)**。
\n您可以查阅以下资源：
- **Siemens** 关于连接主义的数据观点
- 使用 **滞后序列分析 (LSA)** 来处理行为日志
\n\`\`\`python
# 示例：简单的行为序列编码思路
events = ['login', 'video_play', 'quiz_start', 'quiz_submit']
# 分析转化率...
\`\`\`\n`;
    } else {
      content = "这是一个非常有深度的问题。从教育技术的视角来看，技术不仅仅是辅助工具，更是重塑学习生态的关键要素。我们可以尝试从 **TPACK 框架** 的角度来重新审视您的研究假设。";
    }

    return {
      content,
      citations
    };
  }
}

export const aiService = new MockAIService();
