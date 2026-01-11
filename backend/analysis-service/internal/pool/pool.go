package pool

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"time"

	"github.com/eloinsight/analysis-service/internal/engine"
	"go.uber.org/zap"
)

// Pool manages a pool of Stockfish engines
type Pool struct {
	engines    chan *engine.Engine
	config     engine.Config
	logger     *zap.Logger
	size       int
	created    int32
	available  int32
	inUse      int32
	mu         sync.Mutex
	closed     bool
	startTime  time.Time
}

// NewPool creates a new engine pool
func NewPool(size int, config engine.Config, logger *zap.Logger) (*Pool, error) {
	if size <= 0 {
		return nil, errors.New("pool size must be positive")
	}

	pool := &Pool{
		engines:   make(chan *engine.Engine, size),
		config:    config,
		logger:    logger,
		size:      size,
		startTime: time.Now(),
	}

	// Initialize engines
	for i := 0; i < size; i++ {
		eng, err := engine.NewEngine(config, logger)
		if err != nil {
			// Close already created engines
			pool.Close()
			return nil, err
		}
		pool.engines <- eng
		atomic.AddInt32(&pool.created, 1)
		atomic.AddInt32(&pool.available, 1)
	}

	logger.Info("Engine pool created", zap.Int("size", size))
	return pool, nil
}

// Get acquires an engine from the pool
func (p *Pool) Get(ctx context.Context) (*engine.Engine, error) {
	if p.closed {
		return nil, errors.New("pool is closed")
	}

	select {
	case eng := <-p.engines:
		atomic.AddInt32(&p.available, -1)
		atomic.AddInt32(&p.inUse, 1)
		return eng, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Put returns an engine to the pool
func (p *Pool) Put(eng *engine.Engine) {
	if p.closed {
		eng.Close()
		return
	}

	// Reset engine state
	if err := eng.Reset(); err != nil {
		p.logger.Warn("Failed to reset engine, replacing", zap.Error(err))
		eng.Close()
		p.replaceEngine()
		return
	}

	if !eng.IsReady() {
		p.logger.Warn("Engine not ready, replacing")
		eng.Close()
		p.replaceEngine()
		return
	}

	atomic.AddInt32(&p.inUse, -1)
	atomic.AddInt32(&p.available, 1)
	p.engines <- eng
}

// replaceEngine creates a new engine to replace a failed one
func (p *Pool) replaceEngine() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.closed {
		return
	}

	eng, err := engine.NewEngine(p.config, p.logger)
	if err != nil {
		p.logger.Error("Failed to create replacement engine", zap.Error(err))
		atomic.AddInt32(&p.created, -1)
		return
	}

	p.engines <- eng
	atomic.AddInt32(&p.available, 1)
	p.logger.Info("Engine replaced successfully")
}

// Stats returns pool statistics
type Stats struct {
	Size            int
	Available       int
	InUse           int
	StockfishVersion string
	Uptime          time.Duration
}

// GetStats returns current pool statistics
func (p *Pool) GetStats() Stats {
	var version string
	// Try to get version from an engine without blocking
	select {
	case eng := <-p.engines:
		version = eng.Version()
		p.engines <- eng
	default:
		version = "unknown"
	}

	return Stats{
		Size:            p.size,
		Available:       int(atomic.LoadInt32(&p.available)),
		InUse:           int(atomic.LoadInt32(&p.inUse)),
		StockfishVersion: version,
		Uptime:          time.Since(p.startTime),
	}
}

// Size returns the pool size
func (p *Pool) Size() int {
	return p.size
}

// Available returns the number of available engines
func (p *Pool) Available() int {
	return int(atomic.LoadInt32(&p.available))
}

// Close shuts down all engines in the pool
func (p *Pool) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.closed {
		return nil
	}
	p.closed = true

	close(p.engines)

	var firstErr error
	for eng := range p.engines {
		if err := eng.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}

	p.logger.Info("Engine pool closed")
	return firstErr
}

// HealthCheck verifies all engines are healthy
func (p *Pool) HealthCheck(ctx context.Context) error {
	checkedEngines := make([]*engine.Engine, 0, p.size)

	// Get and check each engine
	for i := 0; i < p.size; i++ {
		eng, err := p.Get(ctx)
		if err != nil {
			// Put back already checked engines
			for _, e := range checkedEngines {
				p.Put(e)
			}
			return err
		}

		if !eng.IsReady() {
			// Put back already checked engines
			for _, e := range checkedEngines {
				p.Put(e)
			}
			// Put back this one too (will trigger replacement)
			p.Put(eng)
			return errors.New("engine not ready")
		}

		checkedEngines = append(checkedEngines, eng)
	}

	// Return all engines
	for _, eng := range checkedEngines {
		p.Put(eng)
	}

	return nil
}
