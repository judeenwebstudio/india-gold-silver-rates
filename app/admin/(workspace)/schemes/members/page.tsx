"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string; fullName: string; provider: string; mobile: string | null; email: string | null;
  googleConnected: boolean; googleEmail: string | null; emailVerified: boolean; lastLoginAt: string | null;
};
type MemberReport = { totalMembers: number; activeSchemes: number; maturedSchemes: number; members: Member[] };

export default function AdminSchemeMembersPage() {
  const [data, setData] = useState<MemberReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/schemes/reports")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading scheme members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-stone-900">Enrolled Scheme Members &amp; Accounts</h1>
          <p className="text-xs text-stone-500 mt-1">Overview of registered scheme members, active enrollments, and accumulated Eligible Purchase Value.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Total Enrolled Members</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            {data?.totalMembers || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Active Scheme Accounts</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            {data?.activeSchemes || 0}
          </span>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Matured Accounts</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            {data?.maturedSchemes || 0}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Member Accounts Registry</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider">
                <th className="p-3">Member Name</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Email</th>
                <th className="p-3">Google</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {data?.members?.map((member) => <tr key={member.id}>
                <td className="p-3 font-semibold text-stone-900">{member.fullName}</td>
                <td className="p-3">{member.provider}</td>
                <td className="p-3">{member.mobile || "—"}</td>
                <td className="p-3">{member.email || "—"}</td>
                <td className="p-3">{member.googleConnected ? `Connected (${member.googleEmail})` : "Not connected"}</td>
                <td className="p-3">{member.emailVerified ? "Email verified" : "Not verified"}</td>
                <td className="p-3">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString("en-IN") : "Never"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
