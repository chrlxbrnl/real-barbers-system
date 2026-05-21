import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Save, Scissors, Trash2, X } from "lucide-react";
import AuthGate from "../components/auth/AuthGate";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { FACE_SHAPES, mergeHaircutStyles } from "../data/haircuts";
import {
  addHaircutStyle,
  deleteHaircutStyle,
  subscribeHaircutStyleOverrides,
  updateHaircutStyle,
} from "../services/haircuts";
import { isAdmin } from "../utils/isAdmin";

const emptyForm = {
  name: "",
  faceShape: "Oval",
  imageUrl: "",
  details: "",
};

export default function HaircutManagement() {
  const { user } = useAuth();
  const [firestoreStyles, setFirestoreStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const styles = useMemo(
    () =>
      mergeHaircutStyles(firestoreStyles).sort((a, b) => {
        const faceShapeCompare = a.faceShape.localeCompare(b.faceShape);
        return faceShapeCompare || a.name.localeCompare(b.name);
      }),
    [firestoreStyles],
  );

  useEffect(() => {
    if (!user || !isAdmin(user)) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeHaircutStyleOverrides(
      (data) => {
        setFirestoreStyles(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading haircut styles:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setEditingStyle(null);
    setForm(emptyForm);
  };

  const handleEdit = (style) => {
    setEditingStyle(style);
    setForm({
      name: style.name || "",
      faceShape: style.faceShape || "Oval",
      imageUrl: style.imageUrl || "",
      details: style.details || "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.details.trim()) {
      alert("Haircut name and recommendation are required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        faceShape: form.faceShape,
        imageUrl: form.imageUrl.trim(),
        details: form.details.trim(),
      };

      if (editingStyle) {
        await updateHaircutStyle(editingStyle.id, payload);
      } else {
        await addHaircutStyle(payload);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving haircut style:", error);
      alert("Failed to save haircut style.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (style) => {
    if (!window.confirm(`Delete ${style.name}?`)) return;

    try {
      await deleteHaircutStyle(style);
      if (editingStyle?.id === style.id) resetForm();
    } catch (error) {
      console.error("Error deleting haircut style:", error);
      alert("Failed to delete haircut style.");
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

  if (user === null) {
    return null;
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
            Haircut and Service Management
          </h1>
          <p className="text-gray-600">
            Add, update, delete haircut styles, and edit their recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingStyle ? "Edit Haircut" : "Add Haircut"}
              </h2>
              {editingStyle ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Plus className="h-5 w-5 text-gray-500" />
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Haircut style
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g., Low Fade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Face shape recommendation
                </label>
                <select
                  value={form.faceShape}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      faceShape: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {FACE_SHAPES.map((shape) => (
                    <option key={shape} value={shape}>
                      {shape}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="https://example.com/style.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep the built-in image for default styles.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recommendation
                </label>
                <textarea
                  rows={6}
                  value={form.details}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      details: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Explain why this haircut suits the selected face shape."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : editingStyle ? "Save Changes" : "Add Style"}
              </button>
            </form>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Haircut Styles
              </h2>
              <span className="text-sm text-gray-500">{styles.length} active</span>
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
              ) : styles.length === 0 ? (
                <div className="text-center py-12">
                  <Scissors className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No haircut styles found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Style
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Face Shape
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommendation
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {styles.map((style) => (
                      <tr key={style.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                              {style.image ? (
                                <img
                                  src={style.image}
                                  alt={style.name}
                                  className="block h-full w-full object-contain object-center"
                                />
                              ) : (
                                <Scissors className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {style.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {style.faceShape}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                          <p className="line-clamp-2">{style.details}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(style)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(style)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
