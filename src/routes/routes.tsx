import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import AuthGuard from '../components/AuthGuard'

const DashboardLayout = lazy(() => import('../Dashboard Layout/DashboardLayout'))
const LoginPage = lazy(() => import('../pages/Login/LoginPage'))

// Dashboard
const PharmacyDashboardPage = lazy(() => import('../pages/Dashboard/PharmacyDashboardPage'))

// Sales / Billing
const SalesList = lazy(() => import('../pages/Sales/SalesList'))
const CreateSale = lazy(() => import('../pages/Sales/CreateSale'))
const SaleReceipt = lazy(() => import('../pages/Sales/SaleReceipt'))

// Customers (view/edit/delete only — no add)
const CustomerList = lazy(() => import('../pages/Customers/CustomerList'))
const CustomerDetail = lazy(() => import('../pages/Customers/CustomerDetail'))

// Inventory
const MedicineInventory = lazy(() => import('../pages/Inventory/MedicineInventory'))
const AddMedicine = lazy(() => import('../pages/Inventory/AddMedicine'))

// Suppliers
const SupplierManagement = lazy(() => import('../pages/Suppliers/SupplierManagement'))

// Returns
const ReturnsPage = lazy(() => import('../pages/Returns/ReturnsPage'))

// Expenses
const ExpenseDashboard = lazy(() => import('../pages/Expenses/ExpenseDashboard'))

// Reports
const ReportsDashboard = lazy(() => import('../pages/Reports/ReportsDashboard'))

// Settings
const SettingsDashboard = lazy(() => import('../pages/Settings/SettingsDashboard'))

const routes = [
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },

  {
    element: <AuthGuard />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [{ index: true, element: <PharmacyDashboardPage /> }],
      },
      {
        path: '/sales',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <SalesList /> },
          { path: 'create', element: <CreateSale /> },
          { path: 'receipt/:id', element: <SaleReceipt /> },
        ],
      },
      {
        path: '/customers',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <CustomerList /> },
          { path: ':id', element: <CustomerDetail /> },
        ],
      },
      {
        path: '/inventory',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <MedicineInventory /> },
          { path: 'add-medicine', element: <AddMedicine /> },
          { path: 'edit-medicine/:id', element: <AddMedicine /> },
          { path: 'add-stock/:id', element: <AddMedicine /> },
        ],
      },
      {
        path: '/suppliers',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <SupplierManagement /> },
        ],
      },
      {
        path: '/returns',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ReturnsPage /> },
        ],
      },
      {
        path: '/expenses',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ExpenseDashboard /> },
        ],
      },
      {
        path: '/reports',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ReportsDashboard /> },
        ],
      },
      {
        path: '/settings',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <SettingsDashboard /> },
        ],
      },
    ],
  },
]

export default routes