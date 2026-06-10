import { deriveAgentTaskPatch, selectLatestReviewState } from '../server/jules-task-sync/index.js';

describe('Jules task sync mapping', () => {
  test('keeps a task in progress when Jules opens a PR', () => {
    const patch = deriveAgentTaskPatch({
      session: 'sessions/abc',
      julesStatus: 'COMPLETED',
      prNumber: 42,
      prUrl: 'https://github.com/oogalieboogalie/Homebase/pull/42',
      prState: 'open',
    });

    expect(patch).toEqual(expect.objectContaining({
      status: 'in_progress',
      error: null,
    }));
    expect(patch.result).toContain('PR: https://github.com/oogalieboogalie/Homebase/pull/42');
    expect(patch.result).toContain('PR state: open');
  });

  test('blocks a task when review requests changes', () => {
    const patch = deriveAgentTaskPatch({
      session: 'sessions/abc',
      julesStatus: 'COMPLETED',
      prUrl: 'https://github.com/oogalieboogalie/Homebase/pull/42',
      prState: 'open',
      reviewState: 'CHANGES_REQUESTED',
      reviewAuthor: 'reviewer',
    });

    expect(patch).toEqual(expect.objectContaining({
      status: 'blocked',
      error: null,
    }));
    expect(patch.result).toContain('Review: CHANGES_REQUESTED by reviewer');
  });

  test('completes a task when the PR is merged', () => {
    const patch = deriveAgentTaskPatch({
      session: 'sessions/abc',
      julesStatus: 'COMPLETED',
      prUrl: 'https://github.com/oogalieboogalie/Homebase/pull/42',
      prState: 'merged',
      reviewState: 'APPROVED',
      mergedAt: '2026-06-06T20:00:00.000Z',
    });

    expect(patch).toEqual(expect.objectContaining({
      status: 'completed',
      error: null,
    }));
    expect(patch.result).toContain('Merged: 2026-06-06T20:00:00.000Z');
  });

  test('cancels a task when the PR closes without merge', () => {
    const patch = deriveAgentTaskPatch({
      session: 'sessions/abc',
      julesStatus: 'COMPLETED',
      prUrl: 'https://github.com/oogalieboogalie/Homebase/pull/42',
      prState: 'closed',
    });

    expect(patch).toEqual(expect.objectContaining({
      status: 'cancelled',
      error: null,
    }));
  });

  test('selects the latest submitted review state', () => {
    const state = selectLatestReviewState([
      { state: 'APPROVED', submitted_at: '2026-06-06T18:00:00.000Z', user: { login: 'first' } },
      { state: 'CHANGES_REQUESTED', submitted_at: '2026-06-06T19:00:00.000Z', user: { login: 'second' } },
    ]);

    expect(state).toEqual({
      state: 'CHANGES_REQUESTED',
      author: 'second',
      submittedAt: '2026-06-06T19:00:00.000Z',
    });
  });
});
