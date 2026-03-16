import React, { useEffect, useRef, useState } from 'react';

interface KnowledgeGraphProps {
    messages: Message[];
    theme: 'light' | 'dark';
}

interface Message {
    content: string;
}

interface Node {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    label: string;
    radius: number;
    color: string;
}

interface Link {
    source: string;
    target: string;
    strength: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ messages, theme }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const extractedRef = useRef<Set<string>>(new Set());

    // Extract concepts from messages
    useEffect(() => {
        if (messages.length === 0) return;

        // Simple heuristic: Extract capitalized words or long words
        const concepts = new Set<string>();
        messages.forEach(msg => {
            // Basic extraction for demo (would use NLP in production)
            const words = msg.content.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{5,}/g) || [];
            words.forEach(w => {
                if (!['button', 'system', 'return', 'import', '因为', '所以', '如果', '但是'].includes(w)) {
                    concepts.add(w);
                }
            });
        });

        const newNodes: Node[] = [];
        const newLinks: Link[] = [];

        // Core node
        if (nodes.length === 0) {
            newNodes.push({
                id: 'ROOT',
                x: 400, y: 300, vx: 0, vy: 0,
                label: '核心主题',
                radius: 8,
                color: theme === 'dark' ? '#6366f1' : '#4f46e5'
            });
        }

        let i = 0;
        concepts.forEach(c => {
            if (!extractedRef.current.has(c) && i < 20) { // Limit new nodes
                extractedRef.current.add(c);
                newNodes.push({
                    id: c,
                    x: Math.random() * 800,
                    y: Math.random() * 600,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    label: c,
                    radius: Math.random() * 4 + 3,
                    color: theme === 'dark' ? '#22d3ee' : '#0891b2'
                });
                // Link to random existing node or root
                const target = nodes.length > 0
                    ? nodes[Math.floor(Math.random() * nodes.length)].id
                    : 'ROOT';

                newLinks.push({ source: c, target: target, strength: Math.random() });
                i++;
            }
        });

        if (newNodes.length > 0) {
            setNodes(prev => [...prev, ...newNodes]);
            setLinks(prev => [...prev, ...newLinks]);
        }

    }, [messages, theme]);

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const animate = () => {
            // Physics step
            nodes.forEach(node => {
                node.x += node.vx * 0.5;
                node.y += node.vy * 0.5;

                // Boundary
                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                // Slight friction
                node.vx *= 0.99;
                node.vy *= 0.99;

                // Random organic push
                node.vx += (Math.random() - 0.5) * 0.1;
                node.vy += (Math.random() - 0.5) * 0.1;
            });

            // Render
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Links
            links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (source && target) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });

            // Draw Nodes
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.fill();

                // Glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = node.color;

                // Text
                if (node.radius > 4) {
                    ctx.font = '12px Inter, system-ui';
                    ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#475569';
                    ctx.fillText(node.label, node.x + 10, node.y + 3);
                }
                ctx.shadowBlur = 0;
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationFrame);

    }, [nodes, links, theme]);

    return (
        <div className={`relative w-full h-full overflow-hidden rounded-2xl border ${theme === 'dark' ? 'bg-[#0F172A] border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="absolute top-4 left-4 z-10 font-bold text-xs uppercase tracking-widest opacity-50">自动生成知识网络</div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full object-cover"
            />
        </div>
    );
};

export default KnowledgeGraph;
