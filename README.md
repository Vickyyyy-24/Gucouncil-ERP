# Dynamic CRM System

A comprehensive full-stack CRM (Customer Relationship Management) system with role-based authentication, biometric attendance tracking, and committee management features.

## Features

### 🔐 Authentication & Authorization
- Role-based login system with JWT authentication
- Four user roles: Admin, Committee Member, Committee Head, General Secretary
- Secure password handling and session management

### 👥 User Management
- Create single users with role assignment
- Bulk user creation via CSV upload
- User profile management with social media integration
- Committee assignment and position tracking

### 📊 Attendance System
- Biometric fingerprint attendance tracking
- Punch in/out functionality
- Real-time attendance monitoring
- Attendance reports and analytics
- Individual and committee-wise attendance insights

### 📝 Work Management
- Work report submission with file attachments
- Leave application system with approval workflow
- Committee head approval before GS approval
- Report tracking and status monitoring

### 📈 Dashboard & Analytics
- **Admin Dashboard**: Full system control and user management
- **Member Dashboard**: Personal profile, attendance, and reporting
- **Head Dashboard**: Committee insights and member management
- **GS Dashboard**: Overall system oversight and approval management

### 🔧 Technical Features
- Real-time biometric attendance interface
- CSV bulk import/export functionality
- PDF report generation
- File upload system for documents and profile pictures
- Comprehensive logging system

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Chart.js** - Data visualization and analytics

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **PDFKit** - PDF generation for reports

### Database
- **PostgreSQL** - Primary database (configured for production)
- **In-memory storage** - Currently using in-memory storage for demo

## Project Structure

```
dynamic-crm-system/
├── client/                 # Next.js frontend application
│   ├── app/               # App Router pages
│   ├── components/        # Reusable React components
│   ├── contexts/          # React context providers
│   └── public/            # Static assets
├── server/                # Express.js backend
│   ├── database/          # Database schemas and configurations
│   ├── uploads/           # File storage directory
│   └── server.js          # Main server file
├── package.json           # Root package.json with scripts
└── README.md              # Project documentation
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- PostgreSQL (for production use)
- Fingerprint scanner (for biometric features)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dynamic-crm-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update database credentials and other configurations
   - Configure client environment in `client/.env.local`

4. **Setup database** (for production)
   ```bash
   # Run PostgreSQL migrations
   psql -U postgres -d dynamic_crm < server/database/schema.sql
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend application on http://localhost:3000

## Default Credentials

### Admin Account
- **Council ID**: `Vicky+++`
- **Password**: `admin123`
- **Role**: Admin

### Demo User Accounts
Create additional users through the admin dashboard with different roles:
- Committee Member
- Committee Head
- General Secretary

## Usage Guide

### Admin Functions
1. **User Management**: Create and manage user credentials
2. **Profile Creation**: Create and update member profiles
3. **Bulk Operations**: Import users and profiles via CSV
4. **Attendance Monitoring**: View all attendance records
5. **Biometric Registration**: Register fingerprints for attendance
6. **Reports**: Generate and download system reports

### Committee Member Functions
1. **Profile Management**: Update personal information and social media
2. **Attendance**: Punch in/out using biometric scanner
3. **Work Reports**: Submit daily/weekly work reports
4. **Leave Applications**: Apply for leave with approval workflow

### Committee Head Functions
1. **Committee Insights**: View committee performance metrics
2. **Member Management**: Monitor member attendance and reports
3. **Leave Approvals**: Approve leave applications before GS review
4. **All Member Functions**: Access to member dashboard features

### General Secretary Functions
1. **System Overview**: View insights from all committees
2. **Final Approvals**: Approve leave applications after head approval
3. **System Monitoring**: Comprehensive system analytics
4. **All Member Functions**: Access to member dashboard features

## Biometric Attendance System

### Setup
1. Connect fingerprint scanner to the system
2. Register member fingerprints through admin panel
3. Use dedicated attendance interface for daily scanning

### Usage
1. Access attendance interface at `/attendance`
2. Start attendance session (admin only)
3. Members scan fingerprints to punch in/out
4. View real-time attendance status

## File Management

### Upload Directories
- **Profile Pictures**: `server/uploads/user-pfp/`
- **Work Reports**: `server/uploads/reports/`
- **Leave Documents**: `server/uploads/leaves/`
- **Generated Reports**: `server/uploads/admin-reports/`

### Supported File Types
- Images: JPG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Archives: ZIP, RAR

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Management
- `POST /api/admin/create-user` - Create single user
- `POST /api/admin/bulk-create-users` - Bulk user creation
- `GET /api/admin/user-stats` - User statistics

### Profile Management
- `POST /api/profiles/create` - Create profile
- `PUT /api/profiles/update` - Update profile
- `GET /api/profiles/my-profile` - Get user profile

### Attendance
- `POST /api/attendance/punch-in` - Punch in attendance
- `POST /api/attendance/punch-out` - Punch out attendance
- `GET /api/attendance/my-attendance` - Get attendance history

### Reports & Leaves
- `POST /api/reports/submit` - Submit work report
- `GET /api/reports/my-reports` - Get user reports
- `POST /api/leaves/apply` - Apply for leave
- `GET /api/leaves/my-leaves` - Get leave applications

### Committee Head
- `GET /api/head/committee-insights` - Get committee insights
- `PUT /api/head/approve-leave/:id` - Approve leave

### General Secretary
- `GET /api/gs/all-committees-insights` - Get all committees insights
- `PUT /api/gs/approve-leave/:id` - Final leave approval

## Development

### Adding New Features
1. Create React components in `client/components/`
2. Add API endpoints in `server/server.js`
3. Update database schema if needed
4. Add navigation in respective dashboard components

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow component-based architecture
- Maintain consistent color scheme
- Ensure responsive design

### Code Standards
- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful component names
- Add proper error handling

## Deployment

### Production Build
```bash
# Build client
npm run build

# Start production server
npm start
```

### Environment Configuration
- Update `.env` with production values
- Configure database connection
- Set up SSL certificates
- Configure reverse proxy (Nginx)

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **File Uploads**: Check upload directory permissions
3. **Biometric Scanner**: Verify device connection and drivers
4. **Authentication**: Check JWT secret and token expiration

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

## Acknowledgments

- Thanks to all contributors
- Open source libraries and frameworks used
- Community feedback and suggestions