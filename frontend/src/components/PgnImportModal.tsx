import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

interface PgnImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (gameIds: string[]) => void;
}

interface ImportResponse {
    message: string;
    success: number;
    failed: number;
    errors: string[];
    gameIds: string[];
}

const SAMPLE_PGN = `[Event "Casual Game"]
[Site "Chess.com"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1450"]
[TimeControl "600+0"]
[Opening "Sicilian Defense"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be7 8. f3 O-O 9. Qd2 Be6 10. O-O-O Nbd7 1-0`;

export const PgnImportModal = ({ isOpen, onClose, onSuccess }: PgnImportModalProps) => {
    const [pgnText, setPgnText] = useState('');
    const [importing, setImporting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleImport = async () => {
        if (!pgnText.trim()) {
            toast.error('Please enter PGN text');
            return;
        }

        setImporting(true);
        try {
            const response = await apiClient.post<ImportResponse>('/games/import', {
                pgn: pgnText,
            });

            if (response.success > 0) {
                toast.success(`✅ ${response.message}`, {
                    description: response.failed > 0 
                        ? `${response.errors[0]}${response.errors.length > 1 ? ` (+${response.errors.length - 1} more)` : ''}`
                        : 'Games are ready to be analyzed!',
                    duration: 5000,
                });
                setPgnText('');
                onSuccess?.(response.gameIds);
                onClose();
            } else {
                toast.error('❌ Import failed', {
                    description: response.errors[0] || 'No valid games found in PGN',
                    duration: 5000,
                });
            }
        } catch (err) {
            console.error('Import error:', err);
            const error = err as { response?: { data?: { message?: string } } };
            toast.error('❌ Import failed', {
                description: error.response?.data?.message || 'Failed to import PGN',
                duration: 5000,
            });
        } finally {
            setImporting(false);
        }
    };

    const handleFileUpload = useCallback((file: File) => {
        if (!file.name.endsWith('.pgn') && !file.name.endsWith('.txt')) {
            toast.error('Please upload a .pgn or .txt file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                setPgnText(content);
                toast.success(`📄 Loaded ${file.name}`);
            }
        };
        reader.onerror = () => {
            toast.error('Failed to read file');
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    }, []);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const loadSample = () => {
        setPgnText(SAMPLE_PGN);
        toast.info('📝 Sample PGN loaded');
    };

    // Count games in the PGN text (rough estimate based on [Event tags)
    const estimatedGames = (pgnText.match(/\[Event\s+"/g) || []).length || 
                           (pgnText.match(/\[White\s+"/g) || []).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-card border rounded-xl shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Import PGN</h2>
                            <p className="text-sm text-muted-foreground">Import games from PGN text or file</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Drop zone / File upload */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={cn(
                            "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                            dragActive 
                                ? "border-primary bg-primary/5" 
                                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        )}
                    >
                        <input
                            type="file"
                            accept=".pgn,.txt"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Drop a PGN file</span> or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Supports .pgn and .txt files
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground uppercase">or paste PGN text</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* PGN Text Area */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">PGN Text</label>
                            <button
                                onClick={loadSample}
                                className="text-xs text-primary hover:underline"
                            >
                                Load sample
                            </button>
                        </div>
                        <textarea
                            value={pgnText}
                            onChange={(e) => setPgnText(e.target.value)}
                            placeholder={`Paste your PGN here...\n\nExample:\n[Event "Game"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`}
                            className="w-full h-48 px-3 py-2 rounded-lg border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        />
                    </div>

                    {/* Game count indicator */}
                    {pgnText.trim() && (
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                            estimatedGames > 0 
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                        )}>
                            {estimatedGames > 0 ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Found ~{estimatedGames} game{estimatedGames !== 1 ? 's' : ''} in PGN</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4" />
                                    <span>No games detected. Make sure your PGN has proper headers.</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Info box */}
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>
                            You can import multiple games at once. Each game should have standard PGN headers 
                            like [White], [Black], [Result], and [Date]. After import, games will appear in your 
                            Games list ready for analysis.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !pgnText.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Import {estimatedGames > 0 ? `${estimatedGames} Game${estimatedGames !== 1 ? 's' : ''}` : 'Games'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PgnImportModal;

