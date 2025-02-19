"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, BookOpen, BrainCircuit, Target, Trophy, Users, Brain } from 'lucide-react';
import { useUserTraits } from '@/hooks/useUserTraits';
import { TraitsProgress } from './TraitsProgress';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { traits, isLoading: traitsLoading, error: traitsError } = useUserTraits();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (isLoaded && !isSignedIn) {
        await router.replace("/");
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, router]);

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Sample data - will be replaced with real data from the database
  const userData = {
    name: user?.firstName || "User",
    overallProgress: 68,
    skillsInProgress: 4,
    completedSkills: 12,
    nextMilestone: "Advanced Communication",
    recentAchievements: [
      { id: 1, title: "Active Listening Master", date: "2024-02-15" },
      { id: 2, title: "Conflict Resolution Expert", date: "2024-02-10" },
      { id: 3, title: "Empathy Champion", date: "2024-02-05" }
    ],
    activeSkills: [
      { id: 1, name: "Public Speaking", progress: 75 },
      { id: 2, name: "Negotiation", progress: 45 },
      { id: 3, name: "Team Leadership", progress: 60 },
      { id: 4, name: "Crisis Communication", progress: 30 }
    ],
    practiceStats: {
      totalSessions: 48,
      thisWeek: 5,
      averageScore: 82,
      streakDays: 7
    }
  };

  const handleStartPractice = () => {
    router.push('/dashboard/skills');
  };

  const renderTraitValue = (trait: any) => {
    if (!trait) return 'Not set';
    if (typeof trait === 'string') return trait;
    if (typeof trait === 'object') {
      return Object.entries(trait)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return JSON.stringify(trait);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{userData.name}'s Dashboard</h1>
          <p className="text-muted-foreground">Track your communication skills journey</p>
        </div>
        <Button className="gap-2" onClick={handleStartPractice}>
          Start Practice
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Overall Progress</p>
                <p className="text-2xl font-bold">{userData.overallProgress}%</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-75" />
            </div>
            <Progress value={userData.overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Active Skills</p>
                <p className="text-2xl font-bold">{userData.skillsInProgress}</p>
              </div>
              <BrainCircuit className="h-8 w-8 text-primary opacity-75" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {userData.completedSkills} skills completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Practice Sessions</p>
                <p className="text-2xl font-bold">{userData.practiceStats.totalSessions}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary opacity-75" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {userData.practiceStats.thisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Practice Streak</p>
                <p className="text-2xl font-bold">{userData.practiceStats.streakDays} days</p>
              </div>
              <Trophy className="h-8 w-8 text-primary opacity-75" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Avg. Score: {userData.practiceStats.averageScore}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Active Skills</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="traits">Personal Traits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Next Milestone</CardTitle>
              <CardDescription>Your next learning goal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{userData.nextMilestone}</p>
                  <p className="text-sm text-muted-foreground">Continue practicing to unlock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Progress</CardTitle>
              <CardDescription>Your learning journey this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userData.activeSkills.map(skill => (
                  <div key={skill.id} className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-sm text-muted-foreground">{skill.progress}%</p>
                    </div>
                    <Progress value={skill.progress} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills in Progress</CardTitle>
              <CardDescription>Currently active learning paths</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {userData.activeSkills.map(skill => (
                  <Card key={skill.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{skill.name}</h3>
                        <Button variant="outline" size="sm" onClick={handleStartPractice}>Practice</Button>
                      </div>
                      <Progress value={skill.progress} />
                      <p className="text-sm text-muted-foreground mt-2">
                        {skill.progress}% completed
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Skills and milestones you've mastered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userData.recentAchievements.map(achievement => (
                  <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Trophy className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{achievement.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Achieved on {new Date(achievement.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traits">
          <TraitsProgress traits={traits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}