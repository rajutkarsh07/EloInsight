/**
 * Script to update opening names for existing games
 * Run with: npx ts-node scripts/update-openings.ts
 */

import { PrismaClient } from '@prisma/client';
import { parseEcoFromPgn } from '../src/common/utils';

const prisma = new PrismaClient();

async function updateOpenings() {
    console.log('🔍 Finding games without opening names...');
    
    const games = await prisma.game.findMany({
        where: {
            openingName: { equals: null },
            pgn: { not: '' },
        },
        select: {
            id: true,
            pgn: true,
        },
    });
    
    console.log(`📊 Found ${games.length} games to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const game of games) {
        if (!game.pgn) {
            skipped++;
            continue;
        }
        
        const { eco, name } = parseEcoFromPgn(game.pgn);
        
        if (name) {
            await prisma.game.update({
                where: { id: game.id },
                data: {
                    openingEco: eco || undefined,
                    openingName: name,
                },
            });
            updated++;
            console.log(`✅ Updated game ${game.id}: ${name} (${eco || 'no ECO'})`);
        } else {
            skipped++;
        }
    }
    
    console.log(`\n📈 Results:`);
    console.log(`   Updated: ${updated} games`);
    console.log(`   Skipped: ${skipped} games (no opening detected)`);
}

updateOpenings()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

