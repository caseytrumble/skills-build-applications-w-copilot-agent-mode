import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name: string;
  mascot: string;
  members?: Array<string | { toString(): string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ teams?: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(payload.teams ?? []);
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
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      empty={teams.length === 0 && !loading && !error}
      emptyMessage="No teams available."
    >
      <ul className="list-group list-group-flush">
        {teams.map((team) => (
          <li key={team.name} className="list-group-item">
            <strong>{team.name}</strong>
            <div className="text-muted">Mascot: {team.mascot}</div>
            <div>{(team.members ?? []).map((member) => String(member)).join(', ') || 'No members yet'}</div>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
