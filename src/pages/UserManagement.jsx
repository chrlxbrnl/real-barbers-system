import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle,
  Edit,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import AuthGate from "../components/auth/AuthGate";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/isAdmin";
import {
  setCustomerAccountActive,
  subscribeCustomerAccounts,
  updateCustomerAccount,
} from "../services/users";

const emptyForm = {
  firstName: "",
  lastName: "",
  fullName: "",
  phone: "",
  email: "",
};

function formatTimestamp(value) {
  const date = value?.toDate?.();

  if (!date) return "Not recorded";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDisplayName(account) {
  const firstLast = `${account.firstName || ""} ${account.lastName || ""}`.trim();
  return firstLast || account.fullName || account.displayName || "Unnamed customer";
}

export default function UserManagement() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user || !isAdmin(user)) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeCustomerAccounts(
      (data) => {
        setAccounts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading customer accounts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return accounts;

    return accounts.filter((account) => {
      const searchable = [
        getDisplayName(account),
        account.fullName,
        account.email,
        account.phone,
        account.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [accounts, searchTerm]);

  const activeCount = useMemo(
    () => accounts.filter((account) => account.active !== false).length,
    [accounts],
  );

  const handleEdit = (account) => {
    setEditingAccount(account);
    setForm({
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      fullName: account.fullName || "",
      phone: account.phone || "",
      email: account.email || "",
    });
  };

  const resetForm = () => {
    setEditingAccount(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingAccount) return;

    try {
      setSaving(true);
      await updateCustomerAccount(editingAccount.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      resetForm();
    } catch (error) {
      console.error("Error updating customer account:", error);
      alert("Failed to update customer account.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (account) => {
    const isActive = account.active !== false;
    const action = isActive ? "deactivate" : "reactivate";

    if (!window.confirm(`Are you sure you want to ${action} this account?`)) {
      return;
    }

    try {
      await setCustomerAccountActive(account.id, !isActive);
      if (editingAccount?.id === account.id) resetForm();
    } catch (error) {
      console.error("Error updating customer status:", error);
      alert("Failed to update customer status.");
    }
  };

  if (user === undefined) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        <nav className="bg-white shadow-sm border-b border-gray-200 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-32"></div>
              <div className="hidden md:flex items-center gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-44"></div>
                <div className="h-8 bg-gray-200 rounded w-40"></div>
                <div className="h-8 bg-gray-200 rounded w-28"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded md:hidden"></div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-72"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (!isAdmin(user)) {
    return <div className="text-center mt-20">Access denied</div>;
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">
            View, update, deactivate, and reactivate customer accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-sky-100 rounded-lg">
                <UserRound className="h-6 w-6 text-sky-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Customer Accounts
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="h-6 w-6 text-red-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.length - activeCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAccount ? "Edit Customer" : "Customer Details"}
              </h2>
              {editingAccount && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {editingAccount ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First name
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            ) : (
              <div className="text-sm text-gray-500">
                Select a customer account to update contact details or change
                account status.
              </div>
            )}
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Customer Accounts
                </h2>
                <p className="text-sm text-gray-500">
                  {filteredAccounts.length} shown
                </p>
              </div>

              <div className="relative w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search customers"
                  className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="h-16 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <UserRound className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No customer accounts found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAccounts.map((account) => {
                      const isActive = account.active !== false;

                      return (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getDisplayName(account)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {account.email || "No email"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {account.phone || "No phone"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(account.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(account)}
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusToggle(account)}
                                className={`p-1 ${
                                  isActive
                                    ? "text-red-600 hover:text-red-900"
                                    : "text-green-600 hover:text-green-900"
                                }`}
                                title={isActive ? "Deactivate" : "Reactivate"}
                              >
                                {isActive ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
