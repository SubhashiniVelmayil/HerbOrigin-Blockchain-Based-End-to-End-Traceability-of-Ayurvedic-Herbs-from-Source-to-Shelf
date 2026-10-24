import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, UserRecord } from '../db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  sanitizeUser,
  authenticateToken,
  AuthenticatedRequest,
} from '../auth.js';

export const authRouter = Router();

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
      role,
      phone,
      organization,
      location,
      licenseNumber,
      adminSecretKey,
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const validRoles: UserRecord['role'][] = [
      'Admin',
      'Collector',
      'Processor',
      'LabVerifier',
      'Manufacturer',
      'Consumer',
    ];
    const assignedRole: UserRecord['role'] = validRoles.includes(role) ? role : 'Consumer';

    // Role escalation guard: Admin role requires the admin secret key OR first admin bootstrap
    let isApproved = true;
    if (assignedRole === 'Admin') {
      const existingAdmins = db.getUsers().filter((u) => u.role === 'Admin');
      const expectedSecret = process.env.ADMIN_SECRET_KEY || 'NMPB-HERBORIGIN-ADMIN-2025';

      if (existingAdmins.length > 0 && adminSecretKey !== expectedSecret) {
        return res.status(403).json({
          error: 'Administrator registration requires valid Admin Security Authorization Key.',
        });
      }
    }

    // Check if email already registered
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role: assignedRole,
      phone: phone ? String(phone).trim() : undefined,
      organization: organization ? String(organization).trim() : undefined,
      location: location ? String(location).trim() : undefined,
      licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
      isApproved,
      createdAt: new Date().toISOString(),
    };

    db.addUser(newUser);

    db.addAuditLog({
      entityType: 'User',
      entityId: newUser.id,
      action: 'CREATE',
      performedByUserId: newUser.id,
      performedByName: newUser.fullName,
      role: newUser.role,
      details: `User registered as ${newUser.role} (${newUser.email})`,
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    const isMatch = comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: 'Your account registration is currently pending administrator verification.',
      });
    }

    db.addAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      performedByUserId: user.id,
      performedByName: user.fullName,
      role: user.role,
      details: `User logged in from ${user.location || 'web client'}`,
    });

    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// Get current user profile
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found in database.' });
  }
  return res.json({ user: sanitizeUser(user) });
});

// Update Profile
authRouter.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { fullName, phone, organization, location, licenseNumber } = req.body;

  const updates: Partial<UserRecord> = {};
  if (fullName && typeof fullName === 'string') updates.fullName = fullName.trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (organization !== undefined) updates.organization = String(organization).trim();
  if (location !== undefined) updates.location = String(location).trim();
  if (licenseNumber !== undefined) updates.licenseNumber = String(licenseNumber).trim();

  const updated = db.updateUser(req.user.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.addAuditLog({
    entityType: 'User',
    entityId: updated.id,
    action: 'UPDATE',
    performedByUserId: req.user.id,
    performedByName: updated.fullName,
    role: updated.role,
    details: 'User updated personal profile information',
  });

  return res.json({ message: 'Profile updated successfully', user: sanitizeUser(updated) });
});

// Forgot Password Flow
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid registered email address.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    // For privacy, we return a uniform message or helpful dev message
    return res.json({
      message: 'If an account with that email exists, password reset instructions have been generated.',
    });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  db.savePasswordResetToken(user.email, resetToken, expiresAt);

  db.addAuditLog({
    entityType: 'User',
    entityId: user.id,
    action: 'PASSWORD_RESET',
    performedByUserId: user.id,
    performedByName: user.fullName,
    role: user.role,
    details: 'Password reset token requested',
  });

  // Provide resetToken in response so user can complete flow right in the UI without external SMTP
  return res.json({
    message: 'Password reset link and security verification token generated successfully.',
    resetToken,
    expiresAt,
  });
});

// Reset Password with Token
authRouter.post('/reset-password', (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Password reset token is required.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const email = db.verifyPasswordResetToken(token);
  if (!email) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Associated user account not found.' });
  }

  const updatedHash = hashPassword(newPassword);
  db.updateUser(user.id, { passwordHash: updatedHash });
  db.removePasswordResetToken(token);

  db.addAuditLog({
    entityType: 'User',
    entityId: user.id,
    action: 'PASSWORD_RESET',
    performedByUserId: user.id,
    performedByName: user.fullName,
    role: user.role,
    details: 'Password successfully changed via reset token',
  });

  return res.json({ message: 'Password has been successfully reset! You can now log in.' });
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  // Client discards JWT
  return res.json({ message: 'Signed out successfully' });
});
