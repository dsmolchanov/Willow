'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Play, Pause } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import { useUser, useSession } from '@clerk/nextjs';
import { useSupabase } from '@/context/SupabaseContext';

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  description: string;
  avatar_image_url: string;
  audio_sample_url: string;
}

interface DashboardRightRailProps {
  focusedSkills: Array<{
    skill_id: number;
    name: string;
    priority_level: string;
  }>;
  onRemoveSkill: (skillId: number) => void;
  onStartSession: () => void;
  isLoading: boolean;
  selectedVoice: string | null;
  onVoiceChange: (voiceId: string) => void;
}

export function DashboardRightRail({
  focusedSkills,
  onRemoveSkill,
  onStartSession,
  isLoading,
  selectedVoice,
  onVoiceChange
}: DashboardRightRailProps) {
  const { user } = useUser();
  const { session } = useSession();
  const supabase = useSupabase();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('ru');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      if (!user || !session) {
        console.log('No user or session found, skipping voice fetch');
        return;
      }

      try {
        // Get the session token with supabaseWillow template
        const token = await session.getToken({ template: 'supabaseWillow' });
        // Log a masked version of the token for debugging
        console.log('Token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'null');

        if (!token) {
          console.error('No Willow token available');
          return;
        }

        // Log the query parameters
        console.log('Query params:', {
          language: selectedLanguage
        });

        // First, try to get all voices without language filter
        const allVoicesQuery = await supabase
          .from('voices')
          .select('*');
        
        console.log('All voices query response:', {
          hasData: !!allVoicesQuery.data,
          dataLength: allVoicesQuery.data?.length || 0,
          error: allVoicesQuery.error,
          data: allVoicesQuery.data
        });

        // Make the request with just the language filter
        // RLS policy will handle the is_active check
        const { data, error } = await supabase
          .from('voices')
          .select('*')
          .eq('language', selectedLanguage);
          
        if (error) {
          console.error('Error fetching voices:', error);
          throw error;
        }

        // Log more details about the response
        console.log('Final filtered response:', {
          hasData: !!data,
          dataLength: data?.length || 0,
          isArray: Array.isArray(data),
          data: data
        });

        if (data) {
          console.log(`Successfully fetched ${data.length} voices for language ${selectedLanguage}`);
          setVoices(data);
          if (!selectedVoice && data.length > 0) {
            console.log('Setting default voice:', data[0].voice_id);
            onVoiceChange(data[0].voice_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
        if (err instanceof Error) {
          console.error('Error details:', err.message);
          console.error('Error stack:', err.stack);
        }
      }
    };

    console.log('Effect triggered with:', {
      selectedLanguage,
      hasUser: !!user,
      hasSession: !!session,
      selectedVoice
    });

    fetchVoices();
  }, [selectedLanguage, selectedVoice, onVoiceChange, user, session, supabase]);

  const handlePlaySample = (voiceId: string, sampleUrl: string) => {
    if (playingAudio === voiceId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sampleUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingAudio(null);
      setPlayingAudio(voiceId);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Skill Choice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skills List */}
        <div className="space-y-4">
          {focusedSkills.map((skill) => (
            <div
              key={skill.skill_id}
              className="flex items-center justify-between gap-2 p-2 bg-secondary/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Badge variant={skill.priority_level as any}>
                  {skill.priority_level}
                </Badge>
                <span className="text-sm font-medium">{skill.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveSkill(skill.skill_id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">Russian</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voice Selection List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Choose a voice</label>
          <div className="space-y-2">
            {voices.map((voice) => (
              <div
                key={voice.voice_id}
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedVoice === voice.voice_id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'}`}
                onClick={() => onVoiceChange(voice.voice_id)}
              >
                {/* Top row with avatar, name, gender, and play button */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0">
                    <img 
                      src={voice.avatar_image_url} 
                      alt={voice.name}
                      className="w-10 h-10 rounded-full"
                    />
                  </div>
                  <div className="flex-grow flex items-center gap-2">
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{voice.gender}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySample(voice.voice_id, voice.audio_sample_url);
                    }}
                  >
                    {playingAudio === voice.voice_id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Description row */}
                <div className="text-sm text-muted-foreground">
                  {voice.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Session Button */}
        <div className="pt-4 border-t">
          <Button
            className="w-full"
            onClick={onStartSession}
            disabled={isLoading || focusedSkills.length === 0 || !selectedVoice}
          >
            {isLoading ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : null}
            Start Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 