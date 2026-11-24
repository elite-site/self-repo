let notificationPollingPaused = false;

export function pauseNotificationPolling(): void {
  notificationPollingPaused = true;
}

export function resumeNotificationPolling(): void {
  notificationPollingPaused = false;
}

export function isNotificationPollingPaused(): boolean {
  return notificationPollingPaused;
}
