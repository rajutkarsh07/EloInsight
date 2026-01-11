import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { RotateCw, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import ChessBoardViewer from '../components/chess/ChessBoardViewer';
import { cn } from '../lib/utils';

interface Analysis {
    id: string;
    gameId: string;
    accuracyWhite: number;
    accuracyBlack: number;
    acplWhite: number;
    acplBlack: number;
    blundersWhite: number;
    blundersBlack: number;
    mistakesWhite: number;
    mistakesBlack: number;
    inaccuraciesWhite: number;
    inaccuraciesBlack: number;
    performanceRatingWhite?: number;
    performanceRatingBlack?: number;
    analyzedAt: string;
}

const AnalysisViewer = () => {
    const { gameId } = useParams();
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                // In a real app we'd fetch this. Mocking for now as endpoint might not be ready
                // const data = await apiClient.get<Analysis>(`/analysis/${gameId}`);
                // Mock data since backend endpoint might fail if no analysis exists
                setAnalysis({
                    id: '1',
                    gameId: gameId || '1',
                    accuracyWhite: 85.5,
                    accuracyBlack: 78.2,
                    acplWhite: 35,
                    acplBlack: 55,
                    blundersWhite: 1,
                    blundersBlack: 3,
                    mistakesWhite: 2,
                    mistakesBlack: 4,
                    inaccuraciesWhite: 5,
                    inaccuraciesBlack: 7,
                    analyzedAt: new Date().toISOString()
                });
            } catch (err) {
                setError('Failed to load analysis');
                console.error('Error fetching analysis:', err);
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchAnalysis();
        }
    }, [gameId]);

    const MetricCard = ({
        title,
        whiteValue,
        blackValue,
        unit = '',
        icon,
        reverseColors = false,
    }: {
        title: string;
        whiteValue: number;
        blackValue: number;
        unit?: string;
        icon?: React.ReactNode;
        reverseColors?: boolean;
    }) => {
        // Simplify comparison logic for demo
        const whiteBetter = reverseColors ? whiteValue < blackValue : whiteValue > blackValue;

        return (
            <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                    {icon}
                    <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">White</div>
                        <div className={cn(
                            "text-xl font-bold",
                            whiteBetter ? "text-green-500" : "text-foreground"
                        )}>
                            {whiteValue}{unit}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border mx-4" />
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Black</div>
                        <div className={cn(
                            "text-xl font-bold",
                            !whiteBetter && whiteValue !== blackValue ? "text-green-500" : "text-foreground"
                        )}>
                            {blackValue}{unit}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <RotateCw className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (error || !analysis) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-destructive">
                {error || 'Analysis not found'}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Game Analysis</h1>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">Chess.com</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">Rapid</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">10+0</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border rounded-xl shadow-card overflow-hidden">
                        <ChessBoardViewer
                            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                            interactive={false}
                        />
                    </div>

                    <div className="bg-card border rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Move List</h3>
                        <div className="flex flex-wrap gap-2">
                            {['1. e4 e5', '2. Nf3 Nc6', '3. Bc4 Bc5', '4. c3 Nf6', '5. d3 d6'].map(
                                (move, index) => (
                                    <button
                                        key={index}
                                        className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors border border-transparent hover:border-border"
                                        onClick={() => console.log(`Jump to move: ${move}`)}
                                    >
                                        {move}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-card border rounded-xl shadow-card p-6">
                        <h3 className="text-lg font-semibold mb-6">Analysis Metrics</h3>
                        <div className="space-y-4">
                            <MetricCard
                                title="Accuracy"
                                whiteValue={analysis.accuracyWhite}
                                blackValue={analysis.accuracyBlack}
                                unit="%"
                            />
                            <MetricCard
                                title="Avg Centipawn Loss"
                                whiteValue={analysis.acplWhite}
                                blackValue={analysis.acplBlack}
                                reverseColors
                            />
                            <MetricCard
                                title="Blunders"
                                whiteValue={analysis.blundersWhite}
                                blackValue={analysis.blundersBlack}
                                icon={<XCircle size={14} className="text-red-500" />}
                                reverseColors
                            />
                            <MetricCard
                                title="Mistakes"
                                whiteValue={analysis.mistakesWhite}
                                blackValue={analysis.mistakesBlack}
                                icon={<AlertTriangle size={14} className="text-orange-500" />}
                                reverseColors
                            />
                            <MetricCard
                                title="Inaccuracies"
                                whiteValue={analysis.inaccuraciesWhite}
                                blackValue={analysis.inaccuraciesBlack}
                                icon={<MinusCircle size={14} className="text-yellow-500" />}
                                reverseColors
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisViewer;
