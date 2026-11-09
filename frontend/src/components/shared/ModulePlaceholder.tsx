
import { Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export default function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="rounded-full bg-blue-50 p-4 text-blue-600">
          <Construction size={28} />
        </div>

        <h2 className="mt-4 font-semibold text-slate-800">
          Module under development
        </h2>

        <p className="mt-2 max-w-md text-sm text-slate-500">
          This section will be implemented in the next development stages.
        </p>
      </div>
    </section>
  );
}
