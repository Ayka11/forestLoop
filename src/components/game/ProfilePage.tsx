import React, { useEffect, useState } from 'react';
import { getPlayer, updatePlayer } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfilePage({ playerId }) {
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBadge, setEditBadge] = useState('');

  useEffect(() => {
    getPlayer(playerId).then(({ data }) => {
      setProfile(data);
      setEditName(data?.username || '');
      setEditBadge(data?.profile_badge || '');
    });
  }, [playerId]);

  const handleSave = async () => {
    await updatePlayer(playerId, { username: editName, profile_badge: editBadge });
    getPlayer(playerId).then(({ data }) => setProfile(data));
  };

  if (!profile) return <div>Loading...</div>;

  // Example chart data
  const scoreData = profile.last_10_scores || [];
  const achievementsPercent = profile.achievements_unlocked ? Math.round((profile.achievements_unlocked / 100) * 100) : 0;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Player Profile</h2>
      <div className="mb-4">
        <span className="font-semibold">Display Name:</span>
        <input value={editName} onChange={e => setEditName(e.target.value)} className="ml-2 border px-2" />
        <button onClick={handleSave} className="ml-2 btn btn-sm">Save</button>
      </div>
      <div className="mb-4">
        <span className="font-semibold">Profile Badge:</span>
        <select value={editBadge} onChange={e => setEditBadge(e.target.value)} className="ml-2 border px-2">
          {/* Populate with earned badges */}
          <option value="">None</option>
          <option value="achiever">Achiever</option>
          <option value="explorer">Explorer</option>
          <option value="builder">Builder</option>
        </select>
      </div>
      <div className="mb-4">
        <span className="font-semibold">Favorite Character:</span> {profile.favorite_character}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Total Runs:</span> {profile.total_runs}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Total Distance:</span> {profile.total_distance}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Total Tokens:</span> {profile.total_tokens}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Achievements Unlocked:</span> {achievementsPercent}%
      </div>
      <div className="mb-4">
        <span className="font-semibold">Best Run:</span> {profile.best_run_details || 'N/A'}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Recent Leaderboard Entries:</span>
        <ul>
          {(profile.recent_leaderboard || []).map((entry, idx) => (
            <li key={idx}>{entry}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <span className="font-semibold">Last 10 Scores:</span>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scoreData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
