import { cn } from '../lib/utils';


interface TerminalLine {
    type: 'command' | 'success' | 'error' | 'info';
    content: string;
    timestamp?: string;
}

interface TerminalProps {
    lines: TerminalLine[];
    className?: string;
}

const Terminal = ({ lines, className }: TerminalProps) => {
    return (
        <div className={cn("bg-[#1e1e1e] rounded-lg border border-[#333] shadow-xl overflow-hidden font-mono text-sm", className)}>
            {/* Terminal Header */}
            <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-[#333]">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="ml-2 text-[#999] text-xs">user@eloinsight:~</div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 h-[300px] overflow-y-auto custom-scrollbar">
                {lines.map((line, index) => (
                    <div key={index} className="mb-1 leading-relaxed">
                        {line.type === 'command' && (
                            <div className="flex gap-2">
                                <span className="text-[#4ec9b0] font-bold">➜</span>
                                <span className="text-[#569cd6]">~</span>
                                <span className="text-[#d4d4d4]">{line.content}</span>
                            </div>
                        )}

                        {line.type === 'success' && (
                            <div className="text-[#4ade80] pl-6">{line.content}</div>
                        )}

                        {line.type === 'error' && (
                            <div className="text-[#ef4444] pl-6">{line.content}</div>
                        )}

                        {line.type === 'info' && (
                            <div className="text-[#d4d4d4] pl-6 opacity-80">{line.content}</div>
                        )}
                    </div>
                ))}
                <div className="flex gap-2 mt-2">
                    <span className="text-[#4ec9b0] font-bold">➜</span>
                    <span className="text-[#569cd6]">~</span>
                    <span className="text-[#d4d4d4] animate-pulse">_</span>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
