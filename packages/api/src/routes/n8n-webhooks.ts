// n8n Webhook Integration for GuardianPulse API
// Add this to your existing routes/index.ts

import { Router } from 'express';
import { Logger } from '../utils';

const webhookRouter = Router();

/**
 * n8n Webhook Integration Endpoints
 * These endpoints trigger n8n workflows for automated processing
 */

// Trigger emergency alert workflow
webhookRouter.post('/n8n/emergency-alert', async (req, res) => {
  try {
    const { wardId, alertType, location, guardianPhones, guardianEmails } = req.body;

    const webhookPayload = {
      wardId,
      wardName: req.user?.firstName + ' ' + req.user?.lastName,
      alertType,
      location: JSON.stringify(location),
      timestamp: new Date().toISOString(),
      dashboardUrl: `${process.env.DASHBOARD_URL}/incident/${wardId}`,
      guardianPhone: guardianPhones?.[0], // First guardian
      guardianEmail: guardianEmails?.[0],
      incidentId: `incident_${Date.now()}_${wardId}`,
      apiToken: req.headers.authorization, // Pass JWT for API callbacks
    };

    // Trigger n8n emergency workflow
    const n8nResponse = await fetch('http://guardian-pulse-n8n:5678/webhook/emergency-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n workflow failed: ${n8nResponse.statusText}`);
    }

    const result = await n8nResponse.json();

    Logger.info('Emergency alert workflow triggered', {
      wardId,
      alertType,
      incidentId: webhookPayload.incidentId,
      n8nResponse: result,
    });

    res.json({
      success: true,
      message: 'Emergency alert workflow triggered',
      incidentId: webhookPayload.incidentId,
      n8nResult: result,
    });
  } catch (error) {
    Logger.error('Failed to trigger emergency workflow', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency workflow',
      error: error.message,
    });
  }
});

// Trigger evidence processing workflow
webhookRouter.post('/n8n/evidence-upload', async (req, res) => {
  try {
    const { wardId, incidentId, filename, mimeType, fileSize, fileBuffer } = req.body;

    const webhookPayload = {
      wardId,
      wardName: req.user?.firstName + ' ' + req.user?.lastName,
      incidentId,
      filename,
      mimeType,
      fileSize,
      timestamp: new Date().toISOString(),
      dashboardUrl: `${process.env.DASHBOARD_URL}/evidence/${incidentId}`,
      fileBuffer: fileBuffer.toString('base64'), // Convert to base64 for n8n
    };

    // Trigger n8n evidence processing workflow
    const n8nResponse = await fetch('http://guardian-pulse-n8n:5678/webhook/evidence-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n workflow failed: ${n8nResponse.statusText}`);
    }

    const result = await n8nResponse.json();

    Logger.info('Evidence processing workflow triggered', {
      wardId,
      incidentId,
      filename,
      fileSize,
      n8nResponse: result,
    });

    res.json({
      success: true,
      message: 'Evidence processing workflow triggered',
      filename,
      n8nResult: result,
    });
  } catch (error) {
    Logger.error('Failed to trigger evidence workflow', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to trigger evidence workflow',
      error: error.message,
    });
  }
});

// Trigger subscription update workflow (Stripe webhooks)
webhookRouter.post('/n8n/subscription-update', async (req, res) => {
  try {
    const { userId, subscriptionStatus, planType, stripeEventId } = req.body;

    const webhookPayload = {
      userId,
      subscriptionStatus, // active, canceled, past_due
      planType, // free, premium
      stripeEventId,
      timestamp: new Date().toISOString(),
      dashboardUrl: `${process.env.DASHBOARD_URL}/profile/${userId}`,
    };

    // Trigger n8n subscription workflow
    const n8nResponse = await fetch('http://guardian-pulse-n8n:5678/webhook/subscription-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const result = await n8nResponse.json();

    Logger.info('Subscription workflow triggered', {
      userId,
      subscriptionStatus,
      planType,
      n8nResponse: result,
    });

    res.json({
      success: true,
      message: 'Subscription workflow triggered',
      n8nResult: result,
    });
  } catch (error) {
    Logger.error('Failed to trigger subscription workflow', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to trigger subscription workflow',
      error: error.message,
    });
  }
});

// Health check for n8n integration
webhookRouter.get('/n8n/health', async (req, res) => {
  try {
    const n8nHealthResponse = await fetch('http://guardian-pulse-n8n:5678/healthz');
    const isHealthy = n8nHealthResponse.ok;

    res.json({
      n8nStatus: isHealthy ? 'healthy' : 'unhealthy',
      n8nUrl: 'http://guardian-pulse-n8n:5678',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      n8nStatus: 'unreachable',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default webhookRouter;
