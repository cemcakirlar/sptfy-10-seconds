"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getRandomTrack } from "@/lib/spotify";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import Script from "next/script";

interface Track {
  id: string;
  name: string;
  artist: string;
  albumImage: string;
  uri: string; // Added URI for playback
}

// Extend the Window interface to include the Spotify player callback
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify?: any; // Use 'any' for simplicity, or define specific types
  }
}

export function GameComponent() {
  const { data: session, status } = useSession();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [guess, setGuess] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null); // To hold the Spotify Player instance
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define initializePlayer first
  const initializePlayer = useCallback((token: string) => {
    if (!window.Spotify) {
      console.error("Spotify SDK not loaded yet.");
      setError("Müzik çalar yüklenemedi.");
      return;
    }
    if (playerRef.current) {
      console.log("Player already initialized.");
      return;
    }

    console.log("Initializing Spotify Player with token:", token ? "(valid token)" : "(invalid token)");
    const player = new window.Spotify.Player({
      name: "Spotify Guessing Game Player",
      getOAuthToken: (cb: (token: string) => void) => {
        // TODO: Implement token refresh if needed, for now just return current token
        cb(token);
      },
      volume: 0.5,
    });

    // Error handling
    player.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("Initialization Error:", message);
      setError(`Player Error: ${message}`);
    });
    player.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("Auth Error:", message);
      setError(`Authentication Error: ${message}. Please re-login.`);
      signOut(); // Force logout on auth error
    });
    player.addListener("account_error", ({ message }: { message: string }) => {
      console.error("Account Error:", message);
      setError(`Account Error: ${message}. (Requires Spotify Premium?)`);
    });
    player.addListener("playback_error", ({ message }: { message: string }) => {
      console.error("Playback Error:", message);
      setError(`Playback Error: ${message}`);
      setIsPlaying(false); // Ensure playing state is reset
    });

    // Playback status updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    player.addListener("player_state_changed", (state: any) => {
      if (!state) return;
      console.log("Player State Changed:", state);
      setIsPlaying(!state.paused);
      // Potentially sync current track if needed, but we manage it separately
    });

    // Ready
    player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("PLAYER EVENT: Ready with Device ID", device_id);
      setDeviceId(device_id);
      setIsPlayerReady(true);
      setError(null); // Clear any previous errors on successful init
    });

    // Not Ready
    player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Device ID has gone offline", device_id);
      setIsPlayerReady(false);
      setDeviceId(null);
    });

    // Connect to the player!
    player.connect().then((success: boolean) => {
      if (success) {
        console.log("PLAYER CONNECT: Success!");
        playerRef.current = player; // Store player instance
      } else {
        console.error("PLAYER CONNECT: Failed.");
        setError("Müzik çalar bağlantısı kurulamadı.");
      }
    });
  }, []); // Keep useCallback dependencies minimal

  // --- SDK Initialization Logic (moved initialization call here) ---
  useEffect(() => {
    console.log("Setting up onSpotifyWebPlaybackSDKReady callback...");
    // Define the global callback function expected by the SDK
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("SDK CALLBACK: onSpotifyWebPlaybackSDKReady triggered.");
      // Initialize player ONLY when the callback runs AND user is authenticated
      if (status === "authenticated" && session?.accessToken) {
        console.log("SDK CALLBACK: Session valid, calling initializePlayer...");
        initializePlayer(session.accessToken);
      } else {
        console.log("SDK CALLBACK: Session not ready or invalid token, player not initialized yet.");
      }
    };

    // Cleanup: Remove the callback when the component unmounts
    return () => {
      console.log("Cleaning up onSpotifyWebPlaybackSDKReady callback.");
      delete window.onSpotifyWebPlaybackSDKReady;
      if (playerRef.current) {
        console.log("Disconnecting player during cleanup...");
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
    // IMPORTANT: Run only once on mount, but re-run if auth status changes AFTER mount
    // We need session/status here so the callback *itself* can check the latest auth state when triggered
  }, [status, session, initializePlayer]);

  // --- Effect to load SDK script (simplified) ---
  useEffect(() => {
    // This effect just ensures the script tag is present
    // The actual initialization happens via the window callback above
    console.log("Auth/SDK Effect: Status:", status);
  }, [status]);

  // --- Game Logic ---
  const loadNewTrack = useCallback(async () => {
    if (status !== "authenticated" || !session?.accessToken) {
      setError("Şarkı yüklemek için giriş yapmalısınız.");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      // Stop current playback if any
      if (playerRef.current && isPlaying) {
        await playerRef.current.pause();
        setIsPlaying(false);
      }
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      const track = await getRandomTrack(session.accessToken);
      setCurrentTrack(track);
      setShowAnswer(false);
      setGuess("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setError(errorMessage);
      console.error("Error loading track:", err);
      setCurrentTrack(null); // Clear track on error
    } finally {
      setIsLoading(false);
    }
  }, [session, status, isPlaying]); // Dependencies for loadNewTrack

  // Initial track load on player ready
  useEffect(() => {
    if (isPlayerReady && !currentTrack && !isLoading && !error) {
      console.log("Player ready, loading initial track...");
      loadNewTrack();
    }
  }, [isPlayerReady, loadNewTrack, currentTrack, isLoading, error]);

  const playTrackSnippet = async () => {
    if (!playerRef.current || !deviceId || !currentTrack?.uri) {
      setError("Müzik çalar hazır değil veya şarkı bulunamadı.");
      return;
    }
    if (!session?.accessToken) {
      setError("Oturum geçerli değil. Lütfen tekrar giriş yapın.");
      return;
    }

    try {
      setError(null);
      console.log(`Playing track URI: ${currentTrack.uri} on device ${deviceId}`);
      await playerRef.current.activateElement(); // Ensure player is active

      const token = session.accessToken;

      // Transfer playback to this device (required by Spotify)
      const transferResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }), // Start paused initially
      });
      if (!transferResponse.ok) {
        throw new Error(`Playback transfer failed: ${transferResponse.statusText}`);
      }
      console.log("Playback transferred to SDK device.");

      // Start playback from the beginning for 9 seconds
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uris: [currentTrack.uri], position_ms: 0 }),
      });
      if (!playResponse.ok) {
        throw new Error(`Play command failed: ${playResponse.statusText}`);
      }
      console.log("Playback started via API.");

      setIsPlaying(true);

      // Stop after 9 seconds
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = setTimeout(async () => {
        if (playerRef.current) {
          try {
            await playerRef.current.pause();
            console.log("Paused playback after 9 seconds.");
            setIsPlaying(false);
          } catch (pauseError) {
            console.error("Error pausing playback:", pauseError);
            // Don't set error state here, might be transient
          }
        }
      }, 9000);
    } catch (err) {
      console.error("Error initiating playback:", err);
      const errorMessage = err instanceof Error ? err.message : "Şarkı çalınırken bir hata oluştu.";
      setError(errorMessage);
      setIsPlaying(false);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    }
  };

  const stopPlayback = async () => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (playerRef.current && isPlaying) {
      try {
        await playerRef.current.pause();
        setIsPlaying(false);
        console.log("Playback stopped manually.");
      } catch (err) {
        console.error("Error stopping playback:", err);
        setError("Durdurma sırasında hata.");
      }
    }
  };

  const checkGuess = () => {
    setShowAnswer(true);
    // Stop playback when showing answer
    stopPlayback();
  };

  // --- Render Logic ---
  if (status === "loading") {
    return <div className="text-center p-10">Oturum yükleniyor...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-center p-10">
        <p className="mb-4">Oyuna başlamak için Spotify ile giriş yapın.</p>
        <Button onClick={() => signIn("spotify")}>Spotify ile Giriş Yap</Button>
      </div>
    );
  }

  // Logged in state
  return (
    <>
      {/* Load Spotify SDK Script - Removed onLoad handler */}
      <Script
        src="https://sdk.scdn.co/spotify-player.js"
        strategy="afterInteractive" // Changed strategy for potentially earlier load
        onError={(e) => {
          console.error("Failed to load Spotify SDK script:", e);
          setError("Spotify SDK yüklenemedi. Sayfayı yenileyin.");
        }}
      />

      <div className="max-w-md mx-auto relative">
        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="absolute top-2 right-2 text-xs"
        >
          Çıkış Yap
        </Button>

        <Card className="p-6 bg-zinc-800/50 backdrop-blur mt-10">
          {!isPlayerReady && <div className="text-center text-yellow-500 mb-4">Müzik çalar hazırlanıyor...</div>}
          {error && (
            <div className="text-red-500 mb-4 text-center">
              {error}
              <Button
                onClick={loadNewTrack}
                variant="link"
                className="mt-1 text-red-400"
              >
                Yeni Şarkı Dene
              </Button>
            </div>
          )}

          {isLoading && <div className="text-center py-8">Yeni şarkı yükleniyor...</div>}

          {!isLoading && currentTrack && (
            <>
              <div className="relative aspect-square mb-4 overflow-hidden rounded-lg">
                <Image
                  src={currentTrack.albumImage || "/placeholder.png"} // Fallback image
                  alt="Album cover"
                  fill
                  className={`object-cover transition-all duration-500 ${showAnswer ? "" : "blur-lg brightness-50"}`}
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={playTrackSnippet}
                    disabled={!isPlayerReady || isPlaying || isLoading || !currentTrack || showAnswer}
                    className="flex-1"
                  >
                    ▶️ Çal (9sn)
                  </Button>
                  <Button
                    onClick={stopPlayback}
                    disabled={!isPlaying}
                    variant="secondary"
                    className="flex-1"
                  >
                    ⏹️ Durdur
                  </Button>
                </div>

                <Input
                  type="text"
                  placeholder="Şarkıyı tahmin et..."
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="w-full"
                  disabled={showAnswer || isLoading}
                />

                <div className="flex gap-2">
                  <Button
                    onClick={checkGuess}
                    className="flex-1"
                    disabled={showAnswer || isLoading}
                  >
                    Tahmin Et
                  </Button>
                  <Button
                    onClick={loadNewTrack}
                    variant="outline"
                    disabled={isLoading || !isPlayerReady}
                    className="flex-1"
                  >
                    Yeni Şarkı
                  </Button>
                </div>

                {showAnswer && (
                  <div className="mt-4 text-center">
                    <p className="font-bold text-xl">{currentTrack.name}</p>
                    <p className="text-zinc-400">{currentTrack.artist}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
