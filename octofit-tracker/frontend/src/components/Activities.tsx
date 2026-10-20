import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ activities?: ActivityRecord[] }>('/api/activities');
        if (!active) return;
        setActivities(payload.activities ?? []);
        setError(null);
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Unknown error');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      loading={loading}
      error={error}
      empty={activities.length === 0 && !loading && !error}
      emptyMessage="No activities available."
    >
      <ul aria-label="Activity records" className="list-group list-group-flush">
        {activities.map((activity, index) => (
          <li key={`${activity.type}-${activity.occurredAt ?? index}`} className="list-group-item">
            <strong>{activity.type}</strong> · {activity.minutes} minutes · {activity.points} points
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
