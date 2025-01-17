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
import { useClerkSupabaseClient } from '@/hooks/useClerkSupabaseClient';
import { useSession } from '@clerk/nextjs';
import { useSupabase } from '@/contexts/SupabaseContext';

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
  const { session } = useSession();
  const supabase = useSupabase();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('ru');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      if (!session) return;

      console.log('Fetching voices with Clerk session');
      
      try {
        const { data, error } = await supabase
          .from('voices')
          .select('*')
          .eq('language', selectedLanguage)
          .eq('is_active', true);

        console.log('Fetched voices:', { data, error });

        if (error) {
          console.error('Error fetching voices:', error);
          return;
        }

        setVoices(data || []);
        if (!selectedVoice && data && data.length > 0) {
          onVoiceChange(data[0].voice_id);
        }
      } catch (err) {
        console.error('Unexpected error in fetchVoices:', err);
      }
    };

    fetchVoices();
  }, [selectedLanguage, supabase, selectedVoice, onVoiceChange, session]);

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

  // Cleanup audio on unmount
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
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedVoice === voice.voice_id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'}`}
                onClick={() => onVoiceChange(voice.voice_id)}
              >
                <div className="flex-shrink-0">
                  <img 
                    src={voice.avatar_image_url} 
                    alt={voice.name}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div className="flex-grow">
                  <div className="font-medium">{voice.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {voice.gender} • {voice.description}
                  </div>
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