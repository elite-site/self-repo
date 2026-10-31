import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import * as adminService from '../admin.service';

export async function getActivityLogs(req: Request, res: Response): Promise<void> {
  const result = await adminService.getActivityLogs(req.query as any);
  res.json(result);
}

export async function exportActivityLogs(_req: Request, res: Response): Promise<void> {
  const workbook = await adminService.exportActivityLogsWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.xlsx`);

  try {
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    // The workbook writes straight to the response; once it has flushed headers
    // the only safe failure signal is an aborted connection, not a JSON body.
    if (res.headersSent) {
      logger.error('Activity log export failed after streaming started', {
        route: 'GET /admin/api/activity-logs/export',
        error: String(err),
      });
      res.destroy();
      return;
    }
    throw err;
  }
}
