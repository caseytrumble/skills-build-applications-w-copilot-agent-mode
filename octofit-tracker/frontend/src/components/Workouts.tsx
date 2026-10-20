import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ suggestions?: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (!active) return;
        setSuggestions(payload.suggestions ?? []);
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
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={loading}
      error={error}
      empty={suggestions.length === 0 && !loading && !error}
      emptyMessage="No workout suggestions available."
    >
      <ul className="list-group list-group-flush">
        {suggestions.map((workout) => (
          <li key={workout.title} className="list-group-item">
            <strong>{workout.title}</strong>
            <div className="text-muted">Focus: {workout.focus}</div>
            <div>{workout.reason ?? 'Recommended based on recent activity.'}</div>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
