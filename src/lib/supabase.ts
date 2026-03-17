import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://zcxcpcicyegponagearx.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjVmOWExNzk5LTI0N2EtNDczYS04N2NlLWViMGQyOWE5YWZmOCJ9.eyJwcm9qZWN0SWQiOiJ6Y3hjcGNpY3llZ3BvbmFnZWFyeCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzczNzI4MzAyLCJleHAiOjIwODkwODgzMDIsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.oIn2XZzaFtYpY97HnBhiVVtScnJ4R9pOoLlinExYQ5M';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };

// Player CRUD
export async function getPlayer(id) {
  const { data, error } = await supabase
    .from('game_players')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createPlayer(player) {
  const { data, error } = await supabase
    .from('game_players')
    .insert([player])
    .single();
  return { data, error };
}

export async function updatePlayer(id, updates) {
  const { data, error } = await supabase
    .from('game_players')
    .update(updates)
    .eq('id', id)
    .single();
  return { data, error };
}

// Lobby CRUD
export async function createLobby(roomCode, maxPlayers = 4) {
  const { data, error } = await supabase
    .from('game_lobbies')
    .insert([{ room_code: roomCode, max_players: maxPlayers }])
    .single();
  return { data, error };
}

export async function joinLobby(roomCode, playerId, avatar) {
  const { data, error } = await supabase
    .from('lobby_players')
    .insert([{ room_code: roomCode, player_id: playerId, avatar }])
    .single();
  return { data, error };
}

export async function setPlayerReady(lobbyId, playerId, isReady) {
  const { data, error } = await supabase
    .from('lobby_players')
    .update({ is_ready: isReady })
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerId);
  return { data, error };
}

// Multiplayer sync
export async function updateGameSession(lobbyId, state) {
  const { data, error } = await supabase
    .from('game_sessions')
    .update({ state, updated_at: new Date() })
    .eq('lobby_id', lobbyId);
  return { data, error };
}

export async function subscribeGameSession(lobbyId, callback) {
  return supabase
    .channel('game_sessions')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `lobby_id=eq.${lobbyId}` }, payload => {
      callback(payload.new.state);
    })
    .subscribe();
}