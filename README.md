# Zeno - Personal Finance Manager

A comprehensive personal finance management application built with Next.js, Firebase, and TypeScript. Track your expenses, manage budgets, handle group expenses, and gain insights into your financial health.

## 🚀 Features

### 📊 Dashboard & Analytics

- **Overview Dashboard**: Get a quick snapshot of your financial health
- **Account Balances**: Track multiple accounts (bank, cash, credit cards, etc.)
- **Spending Analytics**: Visualize your spending patterns and trends
- **Budget Tracking**: Monitor your budget vs actual spending

### 💰 Transaction Management

- **Multi-account Support**: Manage checking, savings, credit cards, cash, UPI, investments, and loans
- **Smart Categorization**: Automatic and manual transaction categorization
- **Receipt Upload**: Store receipt images for your transactions
- **Recurring Transactions**: Set up automatic recurring payments
- **Payment Methods**: Track UPI, card, cash, net banking, and auto-debit payments
- **Tags & Notes**: Organize transactions with custom tags and notes

### 👥 Group Expenses

- **Shared Expense Tracking**: Split expenses with family, roommates, or friends
- **Multiple Split Types**: Equal, percentage-based, or custom amount splits
- **Settlement Tracking**: Track who owes what to whom
- **Group Management**: Create and manage expense groups

### 📈 Budget Management

- **Monthly Budgets**: Set budgets for different categories
- **Budget Alerts**: Get notified when approaching budget limits
- **Category-wise Budgets**: Allocate specific amounts to spending categories
- **Budget vs Actual**: Compare planned vs actual spending

### 🎯 Savings Goals

- **Goal Setting**: Create and track savings goals
- **Progress Tracking**: Monitor progress towards your financial goals
- **Target Dates**: Set deadlines for achieving your goals

### 🔐 Authentication & Security

- **Google Sign-in**: Quick and secure authentication
- **Phone Authentication**: SMS-based verification
- **Multi-auth Support**: Link multiple authentication methods
- **Secure Data**: All data encrypted and stored securely in Firebase

### 📱 Modern UI/UX

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Mode**: Toggle between themes
- **Intuitive Interface**: Clean and modern user interface
- **Real-time Updates**: Instant updates across all devices

## 🛠️ Tech Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation
- **Lucide React**: Beautiful icons
- **Sonner**: Toast notifications

### Backend & Database

- **Firebase**: Backend-as-a-Service
  - **Firestore**: NoSQL database
  - **Authentication**: User management
  - **Storage**: File uploads (receipts)
- **Firebase Security Rules**: Data access control

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/Vignesh-kumar-D/finWizard.git
   cd vicky-personal-finance
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Firebase**

   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Google and Phone providers)
   - Create a Firestore database
   - Enable Storage for receipt uploads
   - Get your Firebase config

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Configure Firebase**
   Update `src/lib/firebase/config.ts` with your Firebase configuration.

6. **Set up Firestore Security Rules**

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only access their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Similar rules for other collections
       match /accounts/{accountId} {
         allow read, write: if request.auth != null &&
           resource.data.userId == request.auth.uid;
       }

       match /transactions/{transactionId} {
         allow read, write: if request.auth != null &&
           resource.data.userId == request.auth.uid;
       }

       // Add rules for other collections as needed
     }
   }
   ```

7. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (protected)/       # Protected routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── accounts/      # Account management
│   │   ├── transactions/  # Transaction management
│   │   ├── budget/        # Budget management
│   │   ├── groups/        # Group expenses
│   │   └── profile/       # User profile
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # UI components (buttons, forms, etc.)
│   ├── transaction/      # Transaction-related components
│   ├── account/          # Account-related components
│   └── shared/           # Shared components
├── lib/                  # Utility libraries
│   ├── firebase/         # Firebase configuration and utilities
│   ├── utils.ts          # General utilities
│   └── format.ts         # Formatting utilities
└── types/                # TypeScript type definitions
```

## 🚀 Usage Guide

### Getting Started

1. **Sign Up/Login**: Use Google or phone authentication
2. **Complete Profile**: Add your name and contact information
3. **Add Accounts**: Create your first account (bank, cash, etc.)
4. **Add Transactions**: Start tracking your income and expenses

### Managing Transactions

1. **Add Transaction**: Click "Add Transaction" from the dashboard
2. **Fill Details**: Enter amount, category, account, and description
3. **Upload Receipt**: Optionally upload receipt images
4. **Save**: Transaction is automatically categorized and saved

### Setting Up Budgets

1. **Create Budget**: Go to Budget section
2. **Select Category**: Choose a spending category
3. **Set Amount**: Define your monthly budget limit
4. **Track Progress**: Monitor spending vs budget

### Group Expenses

1. **Create Group**: Add family members or friends
2. **Add Expense**: Record shared expenses
3. **Split Options**: Choose equal, percentage, or custom splits
4. **Track Settlements**: See who owes what

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Write meaningful commit messages

### Adding New Features

1. Create new components in `src/components/`
2. Add types in `src/types/`
3. Update Firebase utilities if needed
4. Add new pages in `src/app/(protected)/`
5. Update this README

## 🔒 Security Features

- **Authentication**: Secure user authentication with Firebase
- **Data Isolation**: Users can only access their own data
- **Input Validation**: All user inputs are validated
- **Secure Storage**: Receipts stored securely in Firebase Storage
- **HTTPS**: All communications are encrypted

## 📱 PWA Features

- **Offline Support**: Basic functionality works offline
- **Installable**: Can be installed as a mobile app
- **Push Notifications**: Budget alerts and reminders
- **Responsive**: Optimized for all screen sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Vignesh-kumar-D/finWizard/issues) page
2. Create a new issue with detailed information
3. Include steps to reproduce the problem

## 🗺️ Roadmap

- [ ] Investment tracking
- [ ] Bill reminders
- [ ] Export to CSV/PDF
- [ ] Multi-currency support
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] Automated categorization with AI

---

**Built with ❤️ using Next.js, Firebase, and TypeScript**
