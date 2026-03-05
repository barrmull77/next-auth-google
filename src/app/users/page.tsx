import type { JSX } from "react";
import { fetchClient } from "@/lib/fetch-client";
import { redirect } from "next/navigation";


interface User {
  _id: string;
  email: string;
  role?: string;
}

const UserPage = async (): Promise<JSX.Element> => {
  
  const res = await fetchClient(`${process.env.API_SERVER_BASE_URL}/api/users`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 403) {
      
      redirect('/login');
    }
  }
  const users: User[] = (await res.json()) ?? [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-white text-center">Users</h2>
        <ul className="space-y-2">
          {users.length === 0 ? (
            <li className="text-slate-500 dark:text-slate-400 text-center">No users found.</li>
          ) : (
            users.map(user => (
              <li key={user._id} className="py-2 px-3 rounded bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex justify-between items-center">
                <span>{user.email}</span>
                <span className="text-xs text-slate-500">{user.role}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default UserPage;
