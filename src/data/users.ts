export interface User {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export const users: User[] = [
  { name: "Alex", email: "alex@email.com", password: "password", role: 'admin' },
  { name: "Bob", email: "bob@email.com", password: "password" }
];

export function getUserByEmail(email: string): User | undefined {
  return users.find(user => user.email === email);
}
