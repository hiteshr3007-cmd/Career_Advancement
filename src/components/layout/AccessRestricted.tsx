import { Shield } from "lucide-react";

export default function AccessRestricted({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Shield className="mx-auto text-slate-300" size={40} />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Access restricted</h1>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
