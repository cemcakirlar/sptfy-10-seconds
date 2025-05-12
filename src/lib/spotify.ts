"use server";

interface SpotifyTrack {
  id: string;
  name: string;
  preview_url: string | null;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
  is_playable?: boolean;
  uri: string;
}

interface PlaylistTrackItem {
  track: SpotifyTrack | null;
}

// Helper function for authenticated Spotify API calls
const fetchSpotifyAPI = async (url: string, token: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error("Spotify API Error:", {
      status: response.status,
      statusText: response.statusText,
      url: url,
    });
    // Attempt to read error body
    try {
      const errorBody = await response.json();
      console.error("Spotify API Error Body:", errorBody);
      throw new Error(`Spotify API Error (${response.status}): ${errorBody.error?.message || response.statusText}`);
    } catch {
      // If reading JSON fails, use status text
      throw new Error(`Spotify API Error (${response.status}): ${response.statusText}`);
    }
  }
  return response.json();
};

export const getRandomTrack = async (accessToken: string) => {
  if (!accessToken) {
    throw new Error("Access token is required.");
  }

  try {
    // Try getting tracks from Turkish pop playlists first
    const playlistId = "6R7XCmJiPndl4PbJIaxZLf"; // Turkish Pop Mix playlist
    const playlistUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=TR&fields=items(track(id,name,artists(name),album(images),is_playable,uri))`;
    const playlistData = await fetchSpotifyAPI(playlistUrl, accessToken);

    const playableTracks = playlistData.items
      .map((item: PlaylistTrackItem) => item.track)
      .filter((track: SpotifyTrack | null): track is SpotifyTrack => !!track && track.is_playable === true);

    console.log(`Found ${playableTracks.length} playable tracks in playlist.`);

    if (playableTracks.length > 0) {
      const track = playableTracks[Math.floor(Math.random() * playableTracks.length)];
      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        albumImage: track.album.images[0]?.url,
        uri: track.uri,
      };
    }

    // Fallback 1: Search Turkish Pop 2024
    console.log("Playlist empty or no playable tracks, falling back to search (turkish-pop)...", accessToken);
    const searchParams1 = new URLSearchParams({
      q: "genre:turkish-pop year:2024",
      type: "track",
      market: "TR",
      limit: "50",
    });
    const searchUrl1 = `https://api.spotify.com/v1/search?${searchParams1.toString()}`;
    const searchData1 = await fetchSpotifyAPI(searchUrl1, accessToken);
    const searchTracks1 = searchData1.tracks?.items.filter((track: SpotifyTrack) => track.is_playable === true) || [];
    console.log("Playable tracks (turkish-pop):", searchTracks1.length);

    if (searchTracks1.length > 0) {
      const track = searchTracks1[Math.floor(Math.random() * searchTracks1.length)];
      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        albumImage: track.album.images[0]?.url,
        uri: track.uri,
      };
    }

    // Fallback 2: Search Popular Turkish Pop
    console.log("Fallback 1 failed, falling back to search (popular)...", accessToken);
    const searchParams2 = new URLSearchParams({
      q: "tag:new genre:pop market:TR",
      type: "track",
      market: "TR",
      limit: "50",
    });
    const searchUrl2 = `https://api.spotify.com/v1/search?${searchParams2.toString()}`;
    const searchData2 = await fetchSpotifyAPI(searchUrl2, accessToken);
    const searchTracks2 = searchData2.tracks?.items.filter((track: SpotifyTrack) => track.is_playable === true) || [];
    console.log("Playable tracks (popular):", searchTracks2.length);

    if (searchTracks2.length === 0) {
      throw new Error("Çalınabilir şarkı bulunamadı. Lütfen tekrar deneyin.");
    }

    const track = searchTracks2[Math.floor(Math.random() * searchTracks2.length)];
    return {
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      albumImage: track.album.images[0]?.url,
      uri: track.uri,
    };
  } catch (error) {
    console.error("Error getting random track:", error);
    if (error instanceof Error) {
      // Add more specific error handling if needed
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        throw new Error("Spotify authentication failed. Please log in again.");
      }
      throw new Error(`Şarkı alınamadı: ${error.message}`);
    }
    throw new Error("Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
  }
};
