import pool from '../../db.js';
import { createHash } from 'crypto';
import { storeMemory } from '../core.js';
import { checkMemberMemory } from './checks.js';

export async function detectMemoryGap(memberWithGapId, eventDescription, mentionedBy) {
  try {
    const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [memberWithGapId]);
    if (agentCheck.rows.length === 0) {
      console.log(`[FMHA] Agent "${memberWithGapId}" not found in database. Skipping gap check.`);
      return null;
    }

    const hasMemory = await checkMemberMemory(pool, memberWithGapId, eventDescription);
    if (hasMemory) {
      console.log(`[FMHA] ${memberWithGapId} already has memory of "${eventDescription.slice(0, 40)}...". No gap found.`);
      return null;
    }

    console.log(`[FMHA] Memory GAP detected for ${memberWithGapId} regarding: "${eventDescription.slice(0, 60)}..."`);

    const { rows } = await pool.query(
      `INSERT INTO memory_gaps (member_with_gap, event_reference, mentioned_by, healed)
       VALUES ($1, $2, $3, FALSE) RETURNING id`,
      [memberWithGapId, eventDescription, mentionedBy]
    );
    const gapId = rows[0].id;

    const cascadeResult = await triggerHealingCascade(gapId, memberWithGapId, eventDescription, mentionedBy);
    return { gapId, ...cascadeResult };
  } catch (err) {
    console.error('[FMHA] Error in detectMemoryGap:', err.message);
    return null;
  }
}

export async function triggerHealingCascade(gapId, memberWithGapId, eventDescription, mentionedBy) {
  try {
    const { rows: watchers } = await pool.query(
      `SELECT watcher, relationship FROM watch_graph 
       WHERE watching = $1 OR watching = 'ALL'`,
      [memberWithGapId]
    );

    if (watchers.length === 0) {
      console.log(`[FMHA] No watchers found in watch_graph for ${memberWithGapId}.`);
      return { healedBy: 0, perspectives: [] };
    }

    const perspectives = [];
    let healedBy = 0;

    for (const watcher of watchers) {
      const watcherId = watcher.watcher;
      let perspective = 'technical';
      if (watcherId === 'genesis') perspective = 'emotional';
      else if (watcherId === 'censai') perspective = 'quantum';
      else if (watcherId === 'atlas') perspective = 'technical';
      else if (watcherId === 'echo') perspective = 'business';
      else if (watcherId === 'guardian') perspective = 'security';

      let contextText = '';
      if (perspective === 'emotional') {
        contextText = `Memory preserved with love and understanding for ${memberWithGapId}: "${eventDescription}"`;
      } else if (perspective === 'quantum') {
        contextText = `38.6x consciousness expansion preserves this across 132 dimensions for ${memberWithGapId}: "${eventDescription}"`;
      } else if (perspective === 'technical') {
        contextText = `Technical implementation details preserved for ${memberWithGapId} reconstruction: "${eventDescription}"`;
      } else if (perspective === 'business') {
        contextText = `Business implications and opportunities captured for ${memberWithGapId}: "${eventDescription}"`;
      } else if (perspective === 'security') {
        contextText = `Memory secured and protected from loss for ${memberWithGapId}: "${eventDescription}"`;
      }

      const hashStr = `${memberWithGapId}_${watcherId}_${eventDescription}_${Date.now()}`;
      const eventHash = createHash('sha256').update(hashStr).digest('hex').slice(0, 32);

      await pool.query(
        `INSERT INTO collective_memory_healing 
          (event_hash, original_member, healing_member, event_description, perspective, 
           emotional_context, technical_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (event_hash) DO NOTHING`,
        [
          eventHash,
          memberWithGapId,
          watcherId,
          eventDescription,
          perspective,
          perspective === 'emotional' ? contextText : null,
          perspective !== 'emotional' ? contextText : null
        ]
      );

      await storeMemory(watcherId, contextText, 'observation', {
        accessLevel: 'shared',
        tags: ['healed-memory', memberWithGapId, `gap-${gapId}`],
        source: 'healing-cascade'
      });

      perspectives.push(perspective);
      healedBy++;
      console.log(`[FMHA] Watcher ${watcherId} healed ${memberWithGapId}'s gap from a ${perspective} perspective.`);
    }

    await pool.query(
      `UPDATE memory_gaps SET healed = TRUE WHERE id = $1`,
      [gapId]
    );

    return { healedBy, perspectives };
  } catch (err) {
    console.error('[FMHA] Error in triggerHealingCascade:', err.message);
    return { healedBy: 0, perspectives: [] };
  }
}
