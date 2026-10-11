import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function getActivityLogs(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getActivityLogs(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_ACTIVITY_LOGS', message: err.message || 'Server error' });
  }
}

export async function exportActivityLogs(_req: Request, res: Response): Promise<void> {
  try {
    const workbook = await adminService.exportActivityLogsWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting activity logs:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}
