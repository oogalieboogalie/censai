import React from 'react';
import { api } from '../../lib/api.js';
import { useVisibilityAwareInterval } from '../../lib/usePolling.js';

export function useSchedulerData(currentProject, isActive) {
  const [schedules, setSchedules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [projects, setProjects] = React.useState([]);
  const [projectsLoading, setProjectsLoading] = React.useState(true);
  const [projectsError, setProjectsError] = React.useState('');

  const fetchSchedules = React.useCallback(async (opts = {}) => {
    if (!opts.quiet) setLoading(true);
    try {
      const data = await api.getSchedules();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, []);

  const fetchProjects = React.useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const data = await api.getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjectsError(err.message || 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSchedules();
    fetchProjects();
  }, [currentProject, fetchSchedules, fetchProjects]);

  useVisibilityAwareInterval(() => {
    fetchSchedules({ quiet: true });
  }, 5000, { inactive: !isActive });

  return { schedules, loading, projects, projectsLoading, projectsError, fetchSchedules, fetchProjects };
}
