# Frequently Asked Questions (FAQ)

## General Questions

### What is EloInsight?
EloInsight is a free, open-source chess game analysis platform that uses Stockfish to analyze your games from Chess.com and Lichess. It provides detailed metrics like accuracy, average centipawn loss, blunders, mistakes, and performance ratings.

### Is EloInsight really free?
Yes! EloInsight is completely free and open-source under the MIT license. There are no hidden costs, premium tiers, or paywalls for core features.

### How is this different from Chess.com or Lichess analysis?
- **Free Unlimited Analysis**: No limits on game analysis
- **Cross-Platform**: Analyze games from both Chess.com and Lichess in one place
- **Open Source**: Transparent, community-driven development
- **Advanced Metrics**: Comprehensive statistics and insights
- **Self-Hostable**: Run your own instance if you prefer

### Can I use this for commercial purposes?
Yes, the MIT license allows commercial use. However, we appreciate attribution and contributions back to the project.

## Account & Privacy

### Do I need to create an account?
Yes, you need to create an account to:
- Link your Chess.com/Lichess accounts
- Save your analysis history
- Track your progress over time

### What data do you collect?
We collect:
- Email and username (for authentication)
- Linked account information (Chess.com/Lichess usernames)
- Your public games from Chess.com/Lichess
- Analysis results

We do NOT collect:
- Your Chess.com/Lichess passwords
- Private games
- Personal information beyond what you provide

### Is my data secure?
Yes. We use:
- Encrypted connections (HTTPS/TLS)
- Hashed passwords (bcrypt)
- Secure token-based authentication (JWT)
- Regular security updates

See [security.md](security.md) for details.

### Can I delete my account?
Yes, you can delete your account at any time from your profile settings. This will permanently remove all your data.

## Game Analysis

### How does game analysis work?
1. You link your Chess.com/Lichess account
2. We fetch your public games
3. Games are queued for analysis
4. Stockfish analyzes each position
5. We calculate metrics and save results
6. You view the analysis in your dashboard

### How long does analysis take?
- **Quick analysis** (depth 15): ~30 seconds per game
- **Standard analysis** (depth 20): ~1-2 minutes per game
- **Deep analysis** (depth 25): ~3-5 minutes per game

Times vary based on game length and server load.

### What metrics do you provide?
- **Accuracy**: How close your moves are to the best moves
- **ACPL**: Average Centipawn Loss per move
- **Blunders**: Moves losing 300+ centipawns
- **Mistakes**: Moves losing 100-300 centipawns
- **Inaccuracies**: Moves losing 50-100 centipawns
- **Performance Rating**: Estimated rating based on play quality
- **Opening Analysis**: Opening name and variations

### Can I analyze specific positions?
Yes! You can analyze any position by entering a FEN string in the position analysis tool.

### What is Stockfish?
Stockfish is the world's strongest open-source chess engine with an Elo rating over 3500. It's completely free and used by millions of chess players worldwide.

### What depth do you use for analysis?
Default is depth 20, which provides excellent accuracy. You can request deeper analysis (up to depth 30) for critical positions.

### Can I re-analyze old games?
Yes, you can request re-analysis of any game. This is useful if:
- You want deeper analysis
- Stockfish has been updated
- Previous analysis failed

## Game Synchronization

### How do I link my Chess.com account?
1. Go to Settings → Linked Accounts
2. Click "Link Chess.com Account"
3. Enter your Chess.com username
4. Click "Link Account"

No password required! We use public APIs.

### How do I link my Lichess account?
Same process as Chess.com:
1. Settings → Linked Accounts
2. Click "Link Lichess Account"
3. Enter your Lichess username
4. Click "Link Account"

### How often are games synced?
- **Automatic sync**: Every hour (if enabled)
- **Manual sync**: Anytime from your dashboard
- **After game**: New games appear within 1-2 hours

### Why aren't all my games showing up?
Possible reasons:
- Games are still being synced (check sync status)
- Games are private (we can only access public games)
- API rate limits (sync will resume automatically)
- Account not properly linked

### Can I sync games from other platforms?
Currently, we support Chess.com and Lichess. Support for other platforms may be added in the future.

## Technical Questions

### What technology stack do you use?
- **Frontend**: React + TypeScript + Material UI
- **Backend**: NestJS, Go, Python
- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: RabbitMQ
- **Engine**: Stockfish 16

See [tech-stack.md](tech-stack.md) for details.

### Can I self-host EloInsight?
Yes! EloInsight is designed to be self-hostable. See [deployment.md](deployment.md) for instructions.

### Is there an API?
Yes, we provide a REST API for programmatic access. API documentation is available at `/api/docs`.

### Can I contribute to the project?
Absolutely! We welcome contributions. See [contributing.md](contributing.md) for guidelines.

### How can I report bugs?
Report bugs on our [GitHub Issues](https://github.com/yourusername/EloInsight/issues) page.

### How can I request features?
Submit feature requests on [GitHub Discussions](https://github.com/yourusername/EloInsight/discussions).

## Performance & Limits

### Are there any usage limits?
For the public instance:
- **API Rate Limit**: 100 requests/minute
- **Analysis Queue**: Fair usage policy
- **Storage**: Unlimited games

Self-hosted instances have no limits.

### Why is analysis taking so long?
Possible reasons:
- High server load (many users analyzing)
- Long game (more positions to analyze)
- Deep analysis requested
- Queue backlog

You can check analysis status in your dashboard.

### Can I prioritize my analysis?
Currently, all analyses are processed in order. Priority queues may be added in the future.

### What if analysis fails?
Failed analyses can be retried. Common causes:
- Invalid PGN data
- Server timeout
- Stockfish crash (rare)

Failed analyses are automatically retried up to 3 times.

## Mobile & Desktop

### Is there a mobile app?
Not yet, but it's on our [roadmap](roadmap.md) for 2027. The web app is mobile-responsive.

### Is there a desktop app?
Not yet, but planned for the future. You can use the web app in any browser.

### Can I use this offline?
No, EloInsight requires an internet connection to:
- Sync games
- Analyze positions
- Access your data

## Troubleshooting

### I forgot my password
Use the "Forgot Password" link on the login page to reset your password.

### My games aren't syncing
Try these steps:
1. Check if your account is properly linked
2. Verify your username is correct
3. Ensure your games are public
4. Try manual sync
5. Check sync status for errors

### Analysis is stuck
If analysis is stuck for >10 minutes:
1. Refresh the page
2. Check analysis status
3. Try re-requesting analysis
4. Contact support if issue persists

### I found a bug
Please report it on [GitHub Issues](https://github.com/yourusername/EloInsight/issues) with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Community & Support

### How can I get help?
- **Documentation**: Check our [docs](/)
- **Discord**: Join our [Discord server](https://discord.gg/eloinsight)
- **GitHub**: [Discussions](https://github.com/yourusername/EloInsight/discussions)
- **Email**: support@eloinsight.dev

### How can I stay updated?
- Follow us on [Twitter](https://twitter.com/eloinsight)
- Join our [Discord](https://discord.gg/eloinsight)
- Watch the [GitHub repo](https://github.com/yourusername/EloInsight)
- Subscribe to our newsletter

### Can I donate to support the project?
While EloInsight is free, donations help cover server costs. See our [GitHub Sponsors](https://github.com/sponsors/eloinsight) page.

### How can I contribute without coding?
You can help by:
- Reporting bugs
- Suggesting features
- Improving documentation
- Spreading the word
- Helping other users
- Translating to other languages

## Future Plans

### What features are coming next?
See our [roadmap](roadmap.md) for planned features.

### Will there be a premium version?
We're committed to keeping core features free. Premium features (if added) would be optional extras, not paywalls for existing functionality.

### Can I vote on features?
Yes! Join our [Discord](https://discord.gg/eloinsight) or [GitHub Discussions](https://github.com/yourusername/EloInsight/discussions) to vote on features.

---

**Didn't find your answer?**

Ask on [Discord](https://discord.gg/eloinsight) or [GitHub Discussions](https://github.com/yourusername/EloInsight/discussions).
