# SmartCRM - Ayurveda ERP System

A comprehensive ERP system for Ayurveda clinics, medical stores, and manufacturing units. Built with React, Node.js, MongoDB, and Firebase.

## 🚀 Features

### Core Modules
- **Dashboard** - Real-time analytics and insights
- **Inventory Management** - Track stock levels, expiry dates, and reorder points
- **Sales & POS** - Point of sale terminal with barcode scanning
- **Purchase Management** - Vendor management and purchase orders
- **Production** - Manufacturing and batch tracking
- **Prescriptions** - Digital prescription management
- **Entities** - Customer and vendor management
- **Users & RBAC** - Role-based access control
- **Reports** - Comprehensive business reports
- **Notifications** - Real-time alerts and reminders

### Key Features
- 📊 Real-time inventory tracking
- 🔍 Barcode scanning and generation
- 📱 Responsive design for mobile and desktop
- 🔐 Secure authentication with Firebase
- 📈 Advanced analytics and reporting
- 🔔 Automated notifications for low stock and expiry
- 📄 PDF invoice generation
- 🎨 Dark/Light theme support

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router v6
- Axios
- Recharts (Analytics)
- React Icons
- React Hot Toast
- Vite

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- Firebase Admin SDK
- JWT Authentication
- Multer (File uploads)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Firebase project with Admin SDK
- npm or yarn

## 🔧 Installation

### 1. Clone the repository
```bash
git clone https://github.com/dinaypatil-web/smartcrm.git
cd smartcrm
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend (.env)
Create `backend/.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

#### Frontend
Update `frontend/src/api/axios.js` with your backend URL:
```javascript
const API_URL = 'http://localhost:5000/api';
```

### 4. Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create a service account and download the JSON key
4. Add credentials to backend `.env` file

### 5. Run the application

#### Development Mode
```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

#### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd backend
node server.js
```

## 🌐 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Configure build settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables if needed
5. Deploy

### Backend (Railway/Render/Heroku)
1. Create new project
2. Connect GitHub repository
3. Set environment variables
4. Deploy from `backend` directory

## 📱 Default Login

After seeding the database:
- **Email**: admin@ayurveda.com
- **Password**: admin123

## 🗂️ Project Structure

```
smartcrm/
├── backend/
│   ├── config/          # Database and Firebase config
│   ├── middleware/      # Auth, RBAC, Audit middleware
│   ├── models/          # MongoDB models
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── seed/            # Database seeders
│   └── server.js        # Entry point
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── api/         # API configuration
│   │   ├── components/  # React components
│   │   ├── context/     # Context providers
│   │   ├── pages/       # Page components
│   │   └── main.jsx     # Entry point
│   └── vite.config.js   # Vite configuration
└── package.json         # Root package file
```

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Firebase authentication integration
- Audit logging for all operations
- Secure password hashing
- CORS protection
- Input validation and sanitization

## 📊 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale
- `GET /api/sales/:id` - Get sale details

### Purchases
- `GET /api/purchases` - Get all purchases
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase

[See full API documentation in `/docs/API.md`]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Dinay Patil** - [dinaypatil-web](https://github.com/dinaypatil-web)

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the database
- Firebase team for authentication services
- All open-source contributors

## 📞 Support

For support, email support@smartcrm.com or create an issue in the GitHub repository.

## 🔄 Version History

- **v1.0.0** (2024) - Initial release
  - Core ERP functionality
  - Inventory management
  - Sales and purchase modules
  - User management with RBAC
  - Reports and analytics

## 🚧 Roadmap

- [ ] Mobile app (React Native)
- [ ] WhatsApp integration for notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline mode support
- [ ] Integration with payment gateways
- [ ] Automated backup system
- [ ] Advanced reporting with custom filters

---

Made with ❤️ for Ayurveda businesses
