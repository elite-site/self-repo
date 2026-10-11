import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { StudentDashboardResponse, DashboardTask, DashboardTone } from '../types';
import { Notification } from '@/shared/types';
import { getNotificationDestination, navigateToNotification } from '@/shared/utils/notificationRouting';
import { formatContentStatus } from '@/shared/utils/status';
import { notificationsApi } from '@/features/notifications/api';
import { githubApi } from '@/features/github/api';
import { User, FileText, Plus, FolderOpen, Video, Calendar, Users } from 'lucide-react';
import { QuickActionItem } from '../components/DashboardQuickActions';

const SETUP_ITEMS = [
  {
    id: 'photo',
    label: 'Profile photo',
    to: '/profile/edit',
    destination: 'your profile',
    icon: User,
    cta: 'Add photo',
    todo: 'Not added',
    done: 'Added',
    hint: 'A face makes your profile recognisable at a glance.',
  },
  {
    id: 'bio',
    label: 'Biography',
    to: '/profile/edit',
    destination: 'your profile',
    icon: FileText,
    cta: 'Write biography',
    todo: 'Not written',
    done: 'Written',
    hint: 'A few lines on what you build and why.',
  },
  {
    id: 'skills',
    label: 'Technical skills',
    to: '/profile/edit',
    destination: 'your profile',
    icon: Plus,
    cta: 'Add skills',
    todo: 'None listed',
    done: 'Listed',
    hint: 'The tools you work in, so recruiters can search for them.',
  },
  {
    id: 'resume',
    label: 'Resume',
    to: '/resume',
    destination: 'your resume',
    icon: FileText,
    cta: 'Upload resume',
    todo: 'Not uploaded',
    done: 'Uploaded',
    hint: 'One PDF a recruiter can download without asking you.',
  },
  {
    id: 'project',
    label: 'First project',
    to: '/portfolio',
    destination: 'your portfolio',
    icon: FolderOpen,
    cta: 'Add project',
    todo: 'None yet',
    done: 'Added',
    hint: 'One finished project beats an empty portfolio.',
  },
] as const;


const greetingFor = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const shortDate = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export function useDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useQuery<StudentDashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getDashboard(),
    staleTime: 60_000,
  });

  const profile = dashboardData?.profile ?? null;
  const resume = dashboardData?.resume ?? null;
  const counts = dashboardData?.counts ?? { projects: 0, achievements: 0, certificates: 0 };
  const events = dashboardData?.events ?? [];
  const registrations = dashboardData?.registrations ?? [];
  const votingCampaigns = dashboardData?.votingCampaigns ?? [];
  const notifications: Notification[] = (dashboardData?.notifications as any) ?? [];
  const github = dashboardData?.github ?? null;

  const profileError = isError && !profile ? 'We could not load your profile right now.' : null;
  const eventsError = isError && events.length === 0 ? 'We could not load department events right now.' : null;
  const votingError = isError && votingCampaigns.length === 0 ? 'We could not load voting campaigns right now.' : null;
  const notifError = isError && notifications.length === 0 ? 'We could not load your recent activity right now.' : null;

  const markNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      markNotificationMutation.mutate(n.id);
    }
    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  const [githubBannerDismissed, setGithubBannerDismissed] = useState(false);

  const isReminderSnoozed = useMemo(() => {
    if (!github) return false;
    if (github.reminderSnoozedUntil) {
      return new Date(github.reminderSnoozedUntil).getTime() > Date.now();
    }
    return false;
  }, [github]);

  const showGithubBanner =
    !githubBannerDismissed &&
    github &&
    !github.connected &&
    !isReminderSnoozed;

  const handleSnoozeGithub = async () => {
    setGithubBannerDismissed(true);
    try {
      await githubApi.snoozeGithubReminder();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Optimistic dismiss remains active
    }
  };

  const checkPhoto = !!profile?.photoUrl;
  const checkBio = !!(profile?.bio || (profile as any)?.biography);
  const checkSkills = !!(profile?.skills && profile.skills.length > 0);
  const effectiveVideoStatus = profile?.video?.status;
  const checkVideo = !!profile?.video;
  const checkResume = !!(resume?.exists || (resume as any)?.driveFileId);
  const checkProjects = (counts?.projects ?? 0) > 0;

  const videoStatus = {
    label: formatContentStatus(effectiveVideoStatus),
    tone: (effectiveVideoStatus === 'APPROVED'
      ? 'badge-approved'
      : effectiveVideoStatus === 'CHANGES_REQUESTED'
        ? 'badge-changes'
        : effectiveVideoStatus === 'REJECTED'
          ? 'badge-rejected'
          : effectiveVideoStatus === 'PENDING' || effectiveVideoStatus === 'UNDER_REVIEW'
            ? 'badge-pending'
            : 'badge-draft') as DashboardTone,
  };

  let videoState: 'todo' | 'progress' | 'done' = 'todo';
  if (checkVideo) {
    if (effectiveVideoStatus === 'APPROVED') {
      videoState = 'done';
    } else if (effectiveVideoStatus === 'PENDING' || effectiveVideoStatus === 'UNDER_REVIEW') {
      videoState = 'progress';
    } else {
      videoState = 'todo';
    }
  }

  const tasks: DashboardTask[] = useMemo(() => {
    return [
      ...SETUP_ITEMS.map<DashboardTask>((item) => {
        const done =
          item.id === 'photo'
            ? checkPhoto
            : item.id === 'bio'
              ? checkBio
              : item.id === 'skills'
                ? checkSkills
                : item.id === 'resume'
                  ? checkResume
                  : checkProjects;

        return {
          id: item.id,
          title: item.label,
          hint: item.hint,
          to: item.to,
          destination: item.destination,
          icon: item.icon,
          state: done ? 'done' : 'todo',
          tone: done ? ('badge-approved' as DashboardTone) : ('badge-draft' as DashboardTone),
          badge: done ? item.done : item.todo,
          cta: item.cta,
        };
      }),
      {
        id: 'video',
        title: 'Intro video',
        hint:
          videoState === 'progress'
            ? 'With the moderation team — nothing needed from you.'
            : 'Ninety seconds of you introducing yourself.',
        dateChip:
          videoState === 'progress'
            ? shortDate(profile?.submission?.submittedAt)
              ? `Sent ${shortDate(profile?.submission?.submittedAt)}`
              : undefined
            : undefined,
        to: '/intro-video',
        destination: 'your intro video',
        icon: Video,
        state: videoState,
        tone: videoStatus.tone,
        badge: videoStatus.label,
        cta: 'Upload video',
      },
    ];
  }, [checkPhoto, checkBio, checkSkills, checkResume, checkProjects, videoState, videoStatus.tone, videoStatus.label, profile?.submission?.submittedAt]);

  const completedCount = tasks.filter((i) => i.state !== 'todo').length;
  const remainingItems = tasks.filter((i) => i.state === 'todo');
  const isComplete = remainingItems.length === 0;
  const completionPercentage = isComplete ? 100 : Math.round((completedCount / tasks.length) * 100);
  const nextMissing = remainingItems.slice(0, 3);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      })
      .slice(0, 3);
  }, [events]);

  const firstName = (profile?.name || 'there').split(' ').filter(Boolean)[0];
  const credentialsCount = (counts?.achievements ?? 0) + (counts?.certificates ?? 0);

  const todayLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const contextLine = profile?.year ? `${todayLine} · Year ${profile.year}` : todayLine;
  const greeting = greetingFor(new Date().getHours());

  const quickActions: QuickActionItem[] = [
    {
      label: 'Upload video',
      hint: videoStatus.label,
      to: '/intro-video',
      icon: Video,
    },
    {
      label: 'Add project',
      hint: `${counts?.projects ?? 0} project${(counts?.projects ?? 0) === 1 ? '' : 's'} · ${credentialsCount} credential${credentialsCount === 1 ? '' : 's'}`,
      to: '/portfolio',
      icon: FolderOpen,
    },
    {
      label: 'Browse events',
      hint: upcomingEvents.length
        ? `${upcomingEvents.length} upcoming`
        : 'Nothing scheduled yet',
      to: '/events',
      icon: Calendar,
    },
    {
      label: 'View team',
      hint: 'Your team workspace',
      to: '/teams',
      icon: Users,
    },
    {
      label: 'Edit profile',
      hint: isComplete ? 'All set' : `${remainingItems.length} step${remainingItems.length === 1 ? '' : 's'} left`,
      to: '/profile/edit',
      icon: User,
    },
    {
      label: 'Resume',
      hint: checkResume ? 'Uploaded' : 'Not uploaded yet',
      to: '/resume',
      icon: FileText,
    },
  ];

  return {
    dashboardData,
    profile,
    resume,
    counts,
    events,
    upcomingEvents,
    registrations,
    votingCampaigns,
    notifications,
    github,
    isLoading,
    isError,
    profileError,
    eventsError,
    votingError,
    notifError,
    showGithubBanner,
    tasks,
    completedCount,
    remainingItems,
    nextMissing,
    isComplete,
    completionPercentage,
    firstName,
    contextLine,
    greeting,
    quickActions,
    refetch,
    handleNotificationClick,
    handleSnoozeGithub,
  };
}
