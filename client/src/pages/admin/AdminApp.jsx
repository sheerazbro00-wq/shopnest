import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import OrderDetail from "./OrderDetail";
import Products from "./Products";
import ProductEdit from "./ProductEdit";
import Customers from "./Customers";
import CustomerDetail from "./CustomerDetail";
import Messages from "./Messages";

// All /admin/* screens. Loaded lazily from App.jsx, so shoppers never
// download the admin bundle.
export default function AdminApp() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/orders/:id" element={<OrderDetail />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/products/:id" element={<ProductEdit />} />
        <Route path="/admin/customers" element={<Customers />} />
        <Route path="/admin/customers/:key" element={<CustomerDetail />} />
        {/* One route for list + reader, so opening a message doesn't remount the inbox */}
        <Route path="/admin/messages/:id?" element={<Messages />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
