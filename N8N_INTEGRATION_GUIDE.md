# 🔄 n8n Integration with GuardianPulse

## 🎯 **Why Self-Hosted n8n is PERFECT for GuardianPulse**

### ✅ **Massive Advantages:**

- **No External Dependencies**: Everything runs in your Docker stack
- **Zero API Limits**: Unlimited workflows and executions
- **Real-time Integration**: Direct connection to your PostgreSQL and Redis
- **Cost Effective**: No subscription fees or usage limits
- **Data Privacy**: All sensitive guardian/ward data stays in your infrastructure
- **Custom Workflows**: Build exactly what you need for safety monitoring

---

## 🚀 **Quick Start Guide**

### **1. Start the Enhanced Stack**

```bash
# Start all services including n8n
docker-compose up -d

# Check all services are running
docker-compose ps

# Services will be available at:
# - API: http://localhost:8080
# - n8n: http://localhost:5678 (admin: guardian_admin / guardian_n8n_2025)
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### **2. Access n8n Dashboard**

- URL: http://localhost:5678
- Username: `guardian_admin`
- Password: `guardian_n8n_2025`

### **3. Connect to Your Services**

n8n has **direct access** to:

- Your PostgreSQL database (`guardian-pulse-postgres:5432`)
- Your Redis cache (`guardian-pulse-redis:6379`)
- Your API (`guardian-pulse-api:8080`)

---

## 🔧 **Pre-Built Workflow Examples**

### **Workflow 1: Emergency Alert Chain**

```
🚨 Webhook Trigger (from your API)
    ↓
📱 Send SMS via Twilio
    ↓
📧 Send Email via SendGrid (parallel)
    ↓
💾 Log to PostgreSQL
    ↓
🔔 Send to Discord/Slack (optional)
```

### **Workflow 2: Evidence Processing**

```
📤 File Upload Webhook
    ↓
☁️ Upload to AWS S3
    ↓
💾 Store metadata in PostgreSQL
    ↓
📱 Notify Guardians via SMS
    ↓
📊 Update Dashboard via WebSocket
```

### **Workflow 3: Incident Escalation**

```
⏰ Schedule Trigger (every 5 minutes)
    ↓
🔍 Check for Unresolved Incidents (PostgreSQL)
    ↓
⚡ If incident > 10 minutes old
    ↓
📞 Call Emergency Services (Twilio Voice)
    ↓
📧 Send Escalation Email
```

---

## 🎛️ **Integration Points with Your Existing Code**

### **API Webhook Endpoints**

Add these to your existing API for n8n triggers:

```typescript
// packages/api/src/routes/webhooks.ts
import { Router } from "express";

const router = Router();

// n8n webhook endpoints
router.post("/n8n/incident-alert", async (req, res) => {
  // Trigger n8n workflow when incident occurs
  const webhookUrl = "http://guardian-pulse-n8n:5678/webhook/incident-alert";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incidentId: req.body.incidentId,
      wardId: req.body.wardId,
      location: req.body.location,
      timestamp: new Date().toISOString(),
    }),
  });

  res.json({ status: "workflow_triggered" });
});

router.post("/n8n/evidence-uploaded", async (req, res) => {
  // Trigger evidence processing workflow
  const webhookUrl = "http://guardian-pulse-n8n:5678/webhook/evidence-process";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });

  res.json({ status: "processing_started" });
});

export default router;
```

### **Socket.IO Integration**

```typescript
// In your socket.ts file, trigger n8n workflows:

socket.on("emergency:alert", async (data) => {
  // Your existing emergency handling...

  // Trigger n8n workflow
  await fetch("http://guardian-pulse-n8n:5678/webhook/emergency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: socket.userId,
      alertType: data.type,
      location: data.location,
      timestamp: new Date().toISOString(),
    }),
  });
});
```

---

## 🛠️ **Specific n8n Node Configurations**

### **Database Connections**

- **Host**: `guardian-pulse-postgres`
- **Port**: `5432`
- **Database**: `guardianpulse_db`
- **Username**: `guardianpulse`
- **Password**: `guardian_secure_2025`

### **HTTP Request to Your API**

- **URL**: `http://guardian-pulse-api:8080/api/v1/...`
- **Authentication**: Add JWT token from database query

### **Redis Cache Operations**

- **Host**: `guardian-pulse-redis`
- **Port**: `6379`

---

## 🔄 **Common Workflow Patterns**

### **1. Multi-Channel Alert System**

```json
{
  "name": "Guardian Alert System",
  "trigger": "webhook",
  "nodes": [
    {
      "type": "Webhook",
      "name": "Incident Webhook"
    },
    {
      "type": "Twilio",
      "name": "Send SMS Alert",
      "parallel": true
    },
    {
      "type": "SendGrid",
      "name": "Send Email Alert",
      "parallel": true
    },
    {
      "type": "PostgreSQL",
      "name": "Log Alert",
      "parallel": true
    },
    {
      "type": "HTTP Request",
      "name": "Update Dashboard",
      "url": "http://guardian-pulse-api:8080/api/v1/incidents/{{$json.incidentId}}/status"
    }
  ]
}
```

### **2. File Processing Pipeline**

```json
{
  "name": "Evidence Processing",
  "trigger": "webhook",
  "nodes": [
    {
      "type": "Webhook",
      "name": "File Upload Trigger"
    },
    {
      "type": "AWS S3",
      "name": "Upload to S3"
    },
    {
      "type": "PostgreSQL",
      "name": "Store File Metadata"
    },
    {
      "type": "HTTP Request",
      "name": "Notify Guardians",
      "url": "http://guardian-pulse-api:8080/api/v1/notify-guardians"
    }
  ]
}
```

---

## 🎯 **Real-World Use Cases**

### **Scenario 1: Emergency Response Chain**

1. Ward triggers SOS button
2. Your API receives alert
3. API calls n8n webhook
4. n8n simultaneously:
   - Sends SMS to all guardians
   - Sends detailed email with location
   - Logs to database
   - Posts to Discord/Slack for monitoring
   - If no response in 5 minutes → calls 911

### **Scenario 2: Evidence Management**

1. Ward uploads audio/video evidence
2. Your API triggers n8n workflow
3. n8n processes:
   - Uploads file to S3
   - Extracts metadata
   - Updates database
   - Sends notification to guardians
   - Generates thumbnail (if video)

### **Scenario 3: Subscription Management**

1. Stripe webhook hits n8n
2. n8n workflow:
   - Updates user subscription in database
   - Sends welcome/cancellation email
   - Updates user permissions
   - Notifies admin via Slack

---

## 🔒 **Security & Best Practices**

### **Network Security**

- All services communicate within Docker network
- No external exposure of sensitive data
- Database credentials shared securely via environment variables

### **Workflow Security**

- Use webhook authentication tokens
- Validate all incoming data
- Log all workflow executions
- Set up error handling and retry logic

### **Monitoring**

```bash
# Monitor n8n workflows
docker logs guardian-pulse-n8n -f

# Check workflow execution logs in n8n UI
# http://localhost:5678/executions
```

---

## 📊 **Performance Benefits**

### **Before n8n:**

- Manual API calls for each service
- Complex error handling in your codebase
- Difficult to modify notification workflows
- Hard to add new integrations

### **After n8n:**

- Visual workflow builder
- Built-in error handling and retries
- Easy to modify workflows without code changes
- 300+ pre-built integrations
- Parallel execution for faster alerts

---

## 🚀 **Migration Strategy**

### **Phase 1: Setup (Week 1)**

1. Start n8n container ✅ (Already done)
2. Create basic webhook endpoints in your API
3. Test simple SMS workflow

### **Phase 2: Core Workflows (Week 2)**

1. Emergency alert chain
2. Evidence processing
3. User notification system

### **Phase 3: Advanced Features (Week 3)**

1. Subscription management
2. Automated escalations
3. Performance monitoring

### **Phase 4: Optimization (Week 4)**

1. Error handling improvements
2. Performance tuning
3. Advanced integrations

---

## 💡 **Why This is BETTER Than External n8n Cloud**

✅ **No API Rate Limits**: Unlimited executions
✅ **Data Privacy**: Sensitive guardian data never leaves your servers
✅ **Cost Effective**: No monthly subscription fees
✅ **Custom Integrations**: Direct access to your database and APIs
✅ **High Performance**: Local network communication (no internet latency)
✅ **Full Control**: Customize n8n exactly for your needs
✅ **Disaster Recovery**: Backup and restore with your regular Docker volumes

---

## 🎯 **Quick Start Commands**

```bash
# Start everything
docker-compose up -d

# Check n8n is ready
curl http://localhost:5678/healthz

# View logs
docker logs guardian-pulse-n8n -f

# Access n8n UI
open http://localhost:5678
```

**Login**: `guardian_admin` / `guardian_n8n_2025`

This setup gives you enterprise-grade workflow automation that's perfectly integrated with your GuardianPulse system! 🚀
