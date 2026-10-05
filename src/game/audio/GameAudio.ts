import { EFFECTS } from '../config/gameBalance';
import type { SimEvent } from '../../types/game';
import type { AudioManager } from './AudioManager';

/**
 * Maps simulation events to sounds. This is the only place that knows which
 * gameplay event makes which noise, so gameplay systems never reference audio.
 */
export function playEventSound(audio: AudioManager, event: SimEvent): void {
  switch (event.type) {
    case 'shotFired':
      audio.play('fire');
      return;
    case 'explosion':
      if (event.radius > 0) audio.play('explosion', event.radius / EFFECTS.shakeRadiusThreshold);
      return;
    case 'projectileBounced':
      audio.play('bounce');
      return;
    case 'projectileRemoved':
      if (event.cue === 'split') audio.play('split');
      if (event.cue === 'airstrikeCalled') audio.play('airstrike');
      return;
    case 'tankDamaged':
      audio.play('hit');
      return;
    case 'tankDestroyed':
      audio.play('destroyed');
      return;
    case 'turnStarted':
      audio.play('turn');
      return;
    case 'gameOver':
      audio.play('victory');
      return;
    case 'projectileSpawned':
    case 'terrainChanged':
    case 'tankMoved':
      return;
  }
}
