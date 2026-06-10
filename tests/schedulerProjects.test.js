/* eslint-env jest */

import { buildSchedulerProjectOptions, getSchedulerProjectReference } from '../src/components/schedulerProjects.js';

describe('scheduler project helpers', () => {
  test('merges shared projects with the current local project without duplicates', () => {
    const options = buildSchedulerProjectOptions(
      [
        { id: 'shared-censaihub', name: 'CensaiHub', path: 'C:\\Homebase\\CensaiHub' },
        { id: 'demo-repo', name: 'Demo Repo', repo: 'owner/demo' },
      ],
      { projectId: 'shared-censaihub', name: 'CensaiHub', path: 'C:\\Homebase\\CensaiHub' }
    );

    expect(options).toHaveLength(2);
    expect(options[0]).toEqual(expect.objectContaining({
      name: 'CensaiHub',
      path: 'C:\\Homebase\\CensaiHub',
      value: 'shared-censaihub',
    }));
    expect(options[1]).toEqual(expect.objectContaining({
      name: 'Demo Repo',
      repo: 'owner/demo',
      value: 'demo-repo',
    }));
  });

  test('prefers explicit project references for scheduled handoff resolution', () => {
    expect(getSchedulerProjectReference({
      projectRef: 'shared-censaihub',
      projectName: 'CensaiHub',
      projectPath: 'C:\\Homebase\\CensaiHub',
    })).toBe('shared-censaihub');

    expect(getSchedulerProjectReference({
      repo: 'owner/demo',
      name: 'Demo Repo',
    })).toBe('owner/demo');
  });
});
