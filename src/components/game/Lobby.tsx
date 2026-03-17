import React, { useState } from 'react';
import { createLobby, joinLobby, setPlayerReady } from '@/lib/supabase';

export default function Lobby({ playerId, avatar }) {
  const [roomCode, setRoomCode] = useState('');
  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);

  const handleCreateLobby = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data } = await createLobby(code);
    setLobby(data);
    setRoomCode(code);
    await joinLobby(code, playerId, avatar);
    // Fetch players in lobby (implement subscription for real-time updates)
  };

  const handleJoinLobby = async () => {
    const { data } = await joinLobby(roomCode, playerId, avatar);
    setLobby(data);
    // Fetch players in lobby (implement subscription for real-time updates)
  };

  const handleReady = async () => {
    await setPlayerReady(lobby.id, playerId, true);
    setIsReady(true);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Multiplayer Lobby</h2>
      {!lobby && (
        <div className="mb-4">
          <button onClick={handleCreateLobby} className="btn btn-sm mr-2">Create Room</button>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value)} className="border px-2 mr-2" placeholder="Room Code" />
          <button onClick={handleJoinLobby} className="btn btn-sm">Join Room</button>
        </div>
      )}
      {lobby && (
        <div className="mb-4">
          <div className="font-semibold">Room Code: {roomCode}</div>
          <div className="font-semibold">Players:</div>
          <ul>
            {players.map((p, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <img src={p.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                <span>{p.username}</span>
                {p.is_ready ? <span className="text-green-500">Ready</span> : <span className="text-gray-500">Not Ready</span>}
              </li>
            ))}
          </ul>
          <button onClick={handleReady} className="btn btn-sm mt-2" disabled={isReady}>Ready Up</button>
        </div>
      )}
    </div>
  );
}
