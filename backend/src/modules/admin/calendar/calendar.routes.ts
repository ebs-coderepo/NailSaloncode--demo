import { Router } from 'express';
import {
  handleGetCalendar,
  handleCreateBlock,
  handleDeleteBlock,
  handleCreateOverride,
  handleDeleteOverride,
} from './calendar.controller';

const router = Router();

// GET  /v1/admin/calendar?year=YYYY&month=MM&staffId=optional
router.get('/',                  handleGetCalendar);
// POST /v1/admin/calendar/blocks
router.post('/blocks',           handleCreateBlock);
// DELETE /v1/admin/calendar/blocks/:id
router.delete('/blocks/:id',     handleDeleteBlock);
// POST /v1/admin/calendar/overrides
router.post('/overrides',        handleCreateOverride);
// DELETE /v1/admin/calendar/overrides/:id
router.delete('/overrides/:id',  handleDeleteOverride);

export default router;
