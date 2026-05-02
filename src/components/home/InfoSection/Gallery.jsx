export default function Gallery() {
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold mb-4">Gallery</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
        <div className="h-32 sm:h-40 rounded bg-gray-200"></div>
      </div>
    </div>
  );
}
