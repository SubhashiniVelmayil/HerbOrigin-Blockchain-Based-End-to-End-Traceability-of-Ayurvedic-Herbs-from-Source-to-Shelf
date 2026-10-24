import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, authorizeRoles, AuthenticatedRequest, sanitizeUser } from '../auth.js';

export const statsRouter = Router();

// GET calculated stats (public or authenticated)
statsRouter.get('/overview', (req, res) => {
  try {
    const batches = db.getBatches();
    const labTests = db.getLabTests();
    const users = db.getUsers();
    const products = db.getProducts();
    const ledger = db.getLedger();

    const totalBatches = batches.length;
    const totalQuantityKg = batches.reduce((acc, b) => acc + (b.quantityKg || 0), 0);
    const approvedBatches = batches.filter((b) => b.status === 'Approved' || b.status === 'Formulated').length;
    const pendingBatches = batches.filter((b) => b.status === 'Collected' || b.status === 'InTesting').length;
    const rejectedBatches = batches.filter((b) => b.status === 'Rejected').length;

    const collectorsCount = users.filter((u) => u.role === 'Collector').length;
    const processorsCount = users.filter((u) => u.role === 'Processor').length;
    const labVerifiersCount = users.filter((u) => u.role === 'LabVerifier').length;
    const manufacturersCount = users.filter((u) => u.role === 'Manufacturer').length;

    const totalTests = labTests.length;
    const passedTests = labTests.filter((t) => t.overallStatus === 'Approved').length;
    const passRatePercent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 100;

    const totalProducts = products.length;
    const totalBlocks = ledger.length;
    const totalTransactions = ledger.reduce((acc, blk) => acc + (blk.transactionsCount || 0), 0);

    return res.json({
      metrics: {
        totalBatches,
        totalQuantityKg: Math.round(totalQuantityKg * 10) / 10,
        approvedBatches,
        pendingBatches,
        rejectedBatches,
        passRatePercent,
        totalProducts,
        totalBlocks,
        totalTransactions,
        rolesBreakdown: {
          collectors: collectorsCount,
          processors: processorsCount,
          labs: labVerifiersCount,
          manufacturers: manufacturersCount,
          totalUsers: users.length,
        },
      },
    });
  } catch (err: any) {
    console.error('Error calculating stats:', err);
    return res.status(500).json({ error: 'Failed to compute system metrics.' });
  }
});

// Admin User Management: List all users
statsRouter.get('/admin/users', authenticateToken, authorizeRoles(['Admin']), (req, res) => {
  const users = db.getUsers().map(sanitizeUser);
  return res.json({ users });
});

// Admin User Approval / Role Update
statsRouter.put('/admin/users/:id/approve', authenticateToken, authorizeRoles(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isApproved, role } = req.body;

  const target = db.getUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const updates: any = {};
  if (typeof isApproved === 'boolean') updates.isApproved = isApproved;
  if (role) updates.role = role;

  const updated = db.updateUser(target.id, updates);

  db.addAuditLog({
    entityType: 'User',
    entityId: target.id,
    action: 'UPDATE',
    performedByUserId: req.user!.id,
    performedByName: req.user!.fullName,
    role: req.user!.role,
    details: `Admin updated user ${target.email}: approved=${isApproved}, role=${role || target.role}`,
  });

  return res.json({ message: 'User status updated successfully', user: sanitizeUser(updated!) });
});

// Admin Audit Logs
statsRouter.get('/admin/audit-logs', authenticateToken, authorizeRoles(['Admin']), (req, res) => {
  const logs = db.getAuditLogs();
  return res.json({ logs });
});
