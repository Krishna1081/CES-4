# CES-4 - Contact Email System

## Overview
A comprehensive contact management and email outreach platform with advanced segmentation, campaign management, and CRM integrations.

## Features

### Contact Management
- CSV import with field mapping
- Advanced dynamic segmentation with logical operators
- Contact verification and deduplication
- Custom field support

### Campaign Management
- Email sequence automation
- A/B testing capabilities
- Performance analytics
- Campaign templates

### CRM Integrations
- **HubSpot**: Full contact, deal, and company sync
- **Salesforce**: Lead and opportunity management
- **Pipedrive**: Person and deal synchronization
- **Zoho CRM**: Contact and lead integration

## Setup

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# CRM OAuth Credentials
# HubSpot
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# Salesforce
SALESFORCE_CLIENT_ID="your-salesforce-client-id"
SALESFORCE_CLIENT_SECRET="your-salesforce-client-secret"

# Pipedrive
PIPEDRIVE_CLIENT_ID="your-pipedrive-client-id"
PIPEDRIVE_CLIENT_SECRET="your-pipedrive-client-secret"

# Zoho CRM
ZOHO_CLIENT_ID="your-zoho-client-id"
ZOHO_CLIENT_SECRET="your-zoho-client-secret"
```

### CRM Integration Setup

#### HubSpot
1. Go to HubSpot Developer Portal
2. Create a new app
3. Add required scopes: `contacts`, `content`
4. Set redirect URI: `https://yourdomain.com/api/integrations/oauth/hubspot`
5. Copy Client ID and Secret to environment variables

#### Salesforce
1. Go to Salesforce Setup → App Manager
2. Create a new Connected App
3. Enable OAuth Settings
4. Add scopes: `api`, `refresh_token`
5. Set callback URL: `https://yourdomain.com/api/integrations/oauth/salesforce`
6. Copy Consumer Key and Secret

#### Pipedrive
1. Go to Pipedrive Developer Hub
2. Create a new app
3. Set redirect URI: `https://yourdomain.com/api/integrations/oauth/pipedrive`
4. Add required scopes: `deals:read`, `persons:read`, `organizations:read`
5. Copy Client ID and Secret

#### Zoho CRM
1. Go to Zoho API Console
2. Create a new server-based application
3. Add scopes: `ZohoCRM.modules.ALL`, `ZohoCRM.settings.ALL`
4. Set redirect URI: `https://yourdomain.com/api/integrations/oauth/zoho`
5. Copy Client ID and Secret

### Database Setup

Run the following commands to set up your database:

```bash
npm run db:push
npm run db:seed
```

### Installation

```bash
npm install
npm run dev
```

## API Endpoints

### Integrations
- `GET /api/integrations` - List all available integrations
- `POST /api/integrations` - Create/update integration
- `GET /api/integrations/[id]` - Get integration details
- `PUT /api/integrations/[id]` - Update integration settings
- `DELETE /api/integrations/[id]` - Disconnect integration

### OAuth
- `POST /api/integrations/oauth/[provider]` - Initiate OAuth flow
- `GET /api/integrations/oauth/[provider]` - Handle OAuth callback

### Sync
- `POST /api/integrations/sync/[provider]` - Trigger manual sync
- `GET /api/integrations/sync/[provider]` - Get sync status

### Segments
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment
- `POST /api/segments/preview` - Preview segment matches
- `GET /api/segments/[id]` - Get segment details
- `PUT /api/segments/[id]` - Update segment
- `DELETE /api/segments/[id]` - Delete segment

### Contacts
- `GET /api/contacts` - List contacts with filtering
- `POST /api/contacts` - Create contact
- `POST /api/contacts/import` - Import contacts from CSV
- `GET /api/contacts/[id]` - Get contact details
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact

## Features in Detail

### Dynamic Segmentation
Create powerful segments using:
- Field conditions (equals, contains, starts with, ends with)
- Date comparisons (on, before, after)
- Logical operators (AND, OR)
- Real-time preview of matching contacts

### Campaign Integration
- Use segments directly in campaign creation
- Seamless workflow from segmentation to outreach
- Campaign performance tracking

### Data Sync
- Bidirectional sync between CRM and platform
- Configurable sync frequency (real-time, hourly, daily)
- Field mapping and custom field support
- Conflict resolution and duplicate handling

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL
- **UI Components**: Shadcn/ui, Radix UI
- **State Management**: SWR for data fetching
- **Authentication**: NextAuth.js
- **Validation**: Zod

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
