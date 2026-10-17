import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deliverAnnouncementNotifications, ANNOUNCEMENT_FANOUT_BATCH_SIZE } from '../src/modules/announcements/announcements.service';
import * as repo from '../src/modules/announcements/announcements.repository';

describe('Announcement Fan-out (D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pages through 1,200 audience students in 3 batches of 500 with skipDuplicates', async () => {
    // Generate 1,200 students: s_0001 to s_1200
    const allStudents = Array.from({ length: 1200 }, (_, i) => ({
      id: `s_${String(i + 1).padStart(4, '0')}`,
    }));

    // Mock findAudienceStudentsBatch to simulate cursor pagination
    const findBatchSpy = vi.spyOn(repo, 'findAudienceStudentsBatch').mockImplementation(
      async (where, take, cursorId) => {
        let startIndex = 0;
        if (cursorId) {
          const idx = allStudents.findIndex((s) => s.id === cursorId);
          startIndex = idx + 1;
        }
        return allStudents.slice(startIndex, startIndex + take);
      }
    );

    const createNotifsSpy = vi.spyOn(repo, 'createAnnouncementNotifications').mockResolvedValue({
      count: 0 as any,
    });

    const announcement = {
      id: 'ann_large_event',
      title: 'Grand Campus Event',
      message: 'All students are invited!',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    };

    await deliverAnnouncementNotifications(announcement, 500);

    // 1. Verify findAudienceStudentsBatch was called 3 times with cursor progression
    expect(findBatchSpy).toHaveBeenCalledTimes(3);

    // Call 1: no cursor, take 500
    expect(findBatchSpy).toHaveBeenNthCalledWith(1, {}, 500, undefined);
    // Call 2: cursor is student 500
    expect(findBatchSpy).toHaveBeenNthCalledWith(2, {}, 500, 's_0500');
    // Call 3: cursor is student 1000
    expect(findBatchSpy).toHaveBeenNthCalledWith(3, {}, 500, 's_1000');

    // 2. Verify createAnnouncementNotifications was called 3 times (500, 500, 200)
    expect(createNotifsSpy).toHaveBeenCalledTimes(3);

    const batch1 = createNotifsSpy.mock.calls[0][0];
    const batch2 = createNotifsSpy.mock.calls[1][0];
    const batch3 = createNotifsSpy.mock.calls[2][0];

    expect(batch1).toHaveLength(500);
    expect(batch2).toHaveLength(500);
    expect(batch3).toHaveLength(200);

    // 3. Verify deterministic ID and skipDuplicates
    expect(batch1[0]).toMatchObject({
      id: 'notif_ann_large_event_s_0001',
      studentId: 's_0001',
      type: 'ANNOUNCEMENT',
      actionUrl: '/announcements/ann_large_event',
    });
    expect(batch3[199]).toMatchObject({
      id: 'notif_ann_large_event_s_1200',
      studentId: 's_1200',
      type: 'ANNOUNCEMENT',
      actionUrl: '/announcements/ann_large_event',
    });
  });

  it('produces no duplicate notifications on re-run due to deterministic IDs and skipDuplicates', async () => {
    const allStudents = Array.from({ length: 1200 }, (_, i) => ({
      id: `s_${String(i + 1).padStart(4, '0')}`,
    }));

    vi.spyOn(repo, 'findAudienceStudentsBatch').mockImplementation(async (where, take, cursorId) => {
      let startIndex = 0;
      if (cursorId) {
        const idx = allStudents.findIndex((s) => s.id === cursorId);
        startIndex = idx + 1;
      }
      return allStudents.slice(startIndex, startIndex + take);
    });

    // Simulate DB unique constraint on primary key ID with skipDuplicates
    const insertedDatabaseIds = new Set<string>();
    let totalInsertAttempts = 0;

    vi.spyOn(repo, 'createAnnouncementNotifications').mockImplementation(async (notifications) => {
      let insertedCount = 0;
      for (const n of notifications) {
        totalInsertAttempts++;
        if (n.id && !insertedDatabaseIds.has(n.id)) {
          insertedDatabaseIds.add(n.id);
          insertedCount++;
        }
      }
      return { count: insertedCount };
    });

    const announcement = {
      id: 'ann_rerun_test',
      title: 'Important Alert',
      message: 'Please review',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    };

    // First execution: 1,200 students inserted
    await deliverAnnouncementNotifications(announcement, 500);
    expect(insertedDatabaseIds.size).toBe(1200);
    expect(totalInsertAttempts).toBe(1200);

    // Second execution (re-run): 0 duplicate IDs inserted
    await deliverAnnouncementNotifications(announcement, 500);
    expect(insertedDatabaseIds.size).toBe(1200); // Set size remains exactly 1200
    expect(totalInsertAttempts).toBe(2400); // 2400 attempts, but zero new entries added
  });
});
