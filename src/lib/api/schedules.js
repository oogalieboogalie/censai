
export async function getSchedules() {
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      return await res.json();
    } catch (e) {
      console.error('Failed to get schedules from backend', e);
      return [];
    }
  }

/**
   * Creates a new scheduled task.
   * @param {Object} schedule
   * @returns {Promise<Object>}
   */
export async function createSchedule(schedule) {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
    if (!res.ok) throw new Error('Failed to create schedule');
    return await res.json();
  }

/**
   * Updates an existing scheduled task.
   * @param {string} id
   * @param {Object} patch
   * @returns {Promise<Object>}
   */
export async function updateSchedule(id, patch) {
    const res = await fetch(`/api/schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update schedule');
    return await res.json();
  }

/**
   * Deletes a scheduled task.
   * @param {string} id
   * @returns {Promise<void>}
   */
export async function deleteSchedule(id) {
    const res = await fetch(`/api/schedules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete schedule');
  }
