# GuardianPulse Feature Testing Guide

## Overview
This guide covers testing the newly implemented features:
1. **Web Dashboard Incident Display** - Enhanced guardian dashboard with incident history
2. **Real SMS Alerting with Twilio** - Actual SMS notifications to guardians

## Prerequisites

### 1. Database Setup
Ensure you have run the database migration for the phone number field:
```bash
cd packages/api
npx prisma migrate dev
```

### 2. Environment Variables
Add the following to your `packages/api/.env` file:

#### Required for SMS Alerts (Twilio)
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

#### Existing Required Variables
```env
PORT=8080
DATABASE_URL=postgresql://username:password@localhost:5432/guardianpulse
JWT_SECRET=your_secret_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket
DASHBOARD_URL=http://localhost:5173
```

### 3. Get Twilio Credentials
1. Sign up at [https://www.twilio.com/](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number or use the trial number

## Feature 1: Web Dashboard Incident Display

### What Was Implemented
- ✅ Tabbed interface with "Wards" and "Incidents" tabs
- ✅ Ward selection dropdown for incident viewing
- ✅ `IncidentList` component with filtering and pagination
- ✅ `IncidentDetails` modal with full incident information
- ✅ Incident status updates (Active → Resolved/Dismissed)
- ✅ Backend API endpoint: `GET /api/incidents/ward/:wardId`
- ✅ Click-through from ward cards to incident history

### Testing Steps

#### 1. Start the Application
```bash
# Terminal 1 - API Server
cd packages/api
npm run dev

# Terminal 2 - Web Frontend
cd packages/web
npm run dev
```

#### 2. Access the Dashboard
1. Navigate to `http://localhost:5173`
2. Login with guardian credentials
3. You should see the dashboard with tabbed interface

#### 3. Test Ward View
1. Verify the "Your Wards (X)" tab shows mock ward data
2. Check that ward cards display:
   - Ward name
   - Status (Online/Offline/Live Session)
   - Last seen time
   - "View Incidents" button

#### 4. Test Incident View
1. Click the "Incidents" tab
2. Select a ward from the dropdown
3. The `IncidentList` component should load
4. Verify incident cards show:
   - Incident type and severity
   - Date and time
   - Status badges
   - Location information

#### 5. Test Incident Details
1. Click on any incident in the list
2. Verify the modal opens with:
   - Full incident details
   - Location with map link
   - Status update buttons
   - Close functionality

#### 6. Test Cross-Navigation
1. From the "Wards" tab, click "View Incidents" on a ward card
2. Verify it switches to "Incidents" tab and selects that ward

### API Testing
Test the incident API directly:
```bash
# Get incidents for a ward (replace :wardId with actual ID)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/api/incidents/ward/WARD_ID

# Update incident status
curl -X PATCH \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status": "RESOLVED"}' \
     http://localhost:8080/api/incidents/INCIDENT_ID/status
```

## Feature 2: Real SMS Alerting with Twilio

### What Was Implemented
- ✅ Twilio SDK integration in alert service
- ✅ Phone number field added to User model
- ✅ SMS alert delivery alongside console logging
- ✅ Error handling and fallback mechanisms
- ✅ Production-ready configuration validation

### Testing Steps

#### 1. Add Phone Numbers to Database
Update user records to include phone numbers:
```sql
-- Connect to your PostgreSQL database
UPDATE "User" SET "phoneNumber" = '+1234567890' WHERE id = 'guardian_user_id';
```

#### 2. Test SMS Alert Delivery
The SMS functionality is integrated into the existing alert system. To test:

1. **Create an Incident** (this will trigger alerts):
   ```bash
   # Use the existing incident creation endpoint
   curl -X POST \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "type": "SOS_TRIGGERED",
          "severity": "HIGH",
          "description": "Emergency SOS activated",
          "wardId": "WARD_USER_ID",
          "location": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        }' \
        http://localhost:8080/api/incidents
   ```

2. **Check SMS Delivery**:
   - Guardian should receive an SMS on their registered phone number
   - Check console logs for Twilio API responses
   - Verify SMS content includes incident details

#### 3. Test Alert Service Directly
```bash
# Test the alert service endpoint if available
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "SOS_TRIGGERED",
       "wardId": "WARD_USER_ID",
       "guardianId": "GUARDIAN_USER_ID",
       "severity": "HIGH",
       "message": "Test SMS alert"
     }' \
     http://localhost:8080/api/alerts/send
```

### SMS Message Format
The SMS alerts will be formatted as:
```
🚨 GuardianPulse Alert

Type: SOS Triggered
Ward: John Doe
Severity: HIGH
Time: 2024-01-15 14:30:22

Emergency SOS activated

View details: http://localhost:5173/dashboard

Reply STOP to opt out
```

### Error Handling Testing

#### 1. Test Without Twilio Credentials
1. Remove Twilio environment variables
2. Restart the API server
3. Create an incident
4. Verify: Console shows warning, alerts still work via console logging

#### 2. Test Invalid Phone Number
1. Set an invalid phone number in the database
2. Create an incident
3. Verify: SMS fails gracefully, console logging continues

#### 3. Test Twilio API Errors
1. Use invalid Twilio credentials
2. Create an incident
3. Verify: Error is logged, system continues functioning

## Troubleshooting

### Common Issues

#### 1. Build Errors in Web Project
```bash
cd packages/web
npm run build
```
If build fails, check for TypeScript errors in:
- `src/components/IncidentList.tsx`
- `src/components/IncidentDetails.tsx`
- `src/pages/DashboardPage.tsx`

#### 2. Missing Incident API Data
- Verify database has incident records
- Check guardian-ward relationships exist
- Confirm JWT token is valid

#### 3. SMS Not Sending
- Verify Twilio credentials are correct
- Check phone number format (+1234567890)
- Review API server logs for Twilio errors
- Ensure Twilio account has sufficient balance

#### 4. Incident Modal Not Opening
- Check browser console for JavaScript errors
- Verify `IncidentDetails` component is imported correctly
- Ensure incident data structure matches interface

### Development Tips

#### 1. Testing with Mock Data
The dashboard currently uses mock ward data. To use real data:
1. Replace the mock data in `DashboardPage.tsx`
2. Create a ward API endpoint
3. Update the `useEffect` to fetch real ward data

#### 2. Customizing SMS Messages
Edit the `formatSMSAlert` function in `packages/api/src/services/alert.service.ts`

#### 3. Adding New Incident Types
1. Update the `AlertType` enum in `alert.service.ts`
2. Add corresponding UI icons/colors in `IncidentList.tsx`
3. Update the incident creation forms

## Production Deployment

### Environment Setup
1. Set all required environment variables
2. Run database migrations: `npx prisma migrate deploy`
3. Build the web project: `npm run build`
4. Verify Twilio webhook configurations (if needed)

### Monitoring
- Monitor Twilio usage and costs
- Track SMS delivery rates
- Log incident creation and alert delivery metrics

## Feature Status

### ✅ Completed
- Web dashboard incident display with tabs
- Incident list with filtering and pagination
- Incident details modal with status updates
- Twilio SMS integration
- Phone number database field
- Backend incident API endpoints
- Error handling and fallbacks

### 🔄 Future Enhancements
- Real-time incident updates via WebSocket
- SMS two-way communication (reply handling)
- Email alert integration
- Push notification support
- Incident analytics and reporting
- Bulk incident management

## API Documentation

### Incident Endpoints
- `GET /api/incidents/ward/:wardId` - Get incidents for a ward
- `PATCH /api/incidents/:id/status` - Update incident status
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/:id` - Get incident details

### Alert Endpoints
- `POST /api/alerts/send` - Send alert to guardians
- `GET /api/alerts/history` - Get alert delivery history
