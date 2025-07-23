# Email Alerting System

## Overview

The GuardianPulse platform includes a comprehensive email alerting system that provides secondary notification channels alongside SMS alerts. This ensures that guardians receive critical safety notifications through multiple channels for maximum reliability.

## Features

### 🚨 Incident Alert Emails

- **Real-time notifications** when incidents are detected
- **Rich HTML formatting** with professional styling
- **Location integration** with Google Maps and OpenStreetMap links
- **Incident details** including type, timestamp, and ward information
- **Call-to-action buttons** for immediate dashboard access

### ✅ Resolution Notifications

- **Automated emails** when incidents are resolved
- **Summary information** including resolution time and responsible party
- **Professional formatting** for clear communication

### 📧 Multi-Channel Delivery

- **Primary SMS alerts** via Twilio for immediate notification
- **Secondary email alerts** for detailed information and record-keeping
- **Graceful fallback** to console logging if other methods fail

## Technical Implementation

### EmailService Class

The `EmailService` class provides a robust email delivery system built on Nodemailer:

```typescript
// Initialize email service
import { emailService } from './services/email.service';

// Send incident alert
await emailService.sendIncidentAlert(['guardian@example.com'], incidentData);

// Send resolution notification
await emailService.sendIncidentResolution(['guardian@example.com'], incidentData, 'Guardian Name');
```

### Integration with AlertService

The enhanced `AlertService` now supports multiple notification channels:

1. **SMS notifications** (primary channel) - immediate alerts
2. **Email notifications** (secondary channel) - detailed information
3. **Console logging** (fallback) - for debugging and backup

```typescript
// Send alert to guardian (multi-channel)
const result = await alertService.sendAlertToGuardian(guardianId, AlertType.SOS_TRIGGERED, alertData);
```

## Configuration

### Environment Variables

Add these environment variables to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com          # SMTP server hostname
EMAIL_PORT=587                     # SMTP server port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                 # true for SSL (465), false for TLS (587)
EMAIL_USER=your_email@gmail.com    # SMTP username/email
EMAIL_PASSWORD=your_app_password   # SMTP password or app-specific password
EMAIL_FROM="GuardianPulse Safety <your_email@gmail.com>"  # From address
```

### Gmail Configuration

For Gmail users, follow these steps:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Use the app password** in `EMAIL_PASSWORD` environment variable

### Other SMTP Providers

The system supports any SMTP provider. Common configurations:

#### Microsoft Outlook/Hotmail

```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

#### Yahoo Mail

```bash
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

#### Custom SMTP Server

```bash
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

## Email Templates

### Incident Alert Email

The incident alert email includes:

- **Urgent header** with red gradient styling
- **Incident summary** with key details in a table format
- **Location information** with map links (if available)
- **Action required section** with clear instructions
- **Dashboard access button** for immediate response
- **Emergency contact information**
- **Professional footer** with branding

### Resolution Email

The resolution notification includes:

- **Success header** with green gradient styling
- **Incident summary** with resolution details
- **Timeline information** showing start and resolution times
- **Dashboard access** for viewing incident history
- **Professional footer** with branding

## API Integration

### Evidence Playback Integration

The email system integrates seamlessly with the evidence playback feature:

```typescript
// When viewing incident evidence in the web dashboard
const evidenceResponse = await incidentAPI.getIncidentEvidence(incidentId);

// Email notifications include links to dashboard for evidence access
const emailData = {
  dashboardUrl: `${config.app.dashboardUrl}/incidents/${incidentId}`,
};
```

### Dashboard Integration

Email links direct guardians to specific dashboard pages:

- **Incident details page** with evidence playback
- **Interactive maps** showing incident location
- **Real-time status updates** and resolution controls

## Security Considerations

### Email Security

- **TLS/SSL encryption** for SMTP connections
- **App-specific passwords** recommended over account passwords
- **Professional email addresses** for better deliverability
- **SPF/DKIM records** recommended for production deployments

### Data Protection

- **No sensitive data** stored in email content
- **Incident IDs** provided for dashboard access
- **Location coordinates** rounded for privacy
- **GDPR compliance** considerations for international deployments

## Monitoring and Logging

### Email Delivery Monitoring

```typescript
// Check email service status
const isReady = emailService.isReady();

// Test email configuration
const connectionOk = await emailService.testConnection();
```

### Logging

- **Successful deliveries** logged with message IDs
- **Failed attempts** logged with error details
- **Configuration issues** logged during startup
- **Performance metrics** available through service stats

## Production Deployment

### Recommended Setup

1. **Professional email service** (SendGrid, AWS SES, etc.)
2. **Dedicated domain** with proper DNS records
3. **Rate limiting** to prevent abuse
4. **Monitoring alerts** for delivery failures
5. **Backup notification channels** for critical alerts

### Scaling Considerations

- **Queue-based processing** for high-volume deployments
- **Multiple SMTP providers** for redundancy
- **Email template caching** for performance
- **Database logging** of all email activities

## Troubleshooting

### Common Issues

#### Email Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials and server settings
3. Check network connectivity to SMTP server
4. Review application logs for error details

#### Gmail Authentication Errors

1. Ensure 2-Factor Authentication is enabled
2. Use app-specific password, not account password
3. Check "Less secure app access" settings (not recommended)

#### Emails Going to Spam

1. Configure SPF records for your domain
2. Set up DKIM signing
3. Use a professional "From" address
4. Avoid spam trigger words in subject lines

### Debug Mode

Enable debug logging in development:

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## Future Enhancements

### Planned Features

- **Email templates customization** via admin interface
- **Bulk email operations** for multiple guardians
- **Email delivery analytics** and reporting
- **Rich media attachments** for evidence sharing
- **Internationalization** for multiple languages
- **Email scheduling** for non-urgent notifications

### Integration Opportunities

- **Calendar integration** for incident scheduling
- **Third-party CRM** integration for case management
- **Advanced analytics** for notification effectiveness
- **AI-powered** content optimization

## Support

For technical support or configuration assistance:

1. **Check the logs** first for error details
2. **Review environment variables** for correct configuration
3. **Test SMTP settings** with external tools
4. **Consult documentation** for your email provider
5. **File an issue** on the project repository for bugs

---

_This email system enhances the GuardianPulse safety platform by providing reliable, professional notification delivery to ensure guardians never miss critical safety alerts._
