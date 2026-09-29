/** Sellers (and buyers opening a shop) get the shop workspace; other partner roles get a trimmed one. */
export type SellWorkspace = 'seller' | 'talent' | 'freelancer' | 'employer';

export function sellWorkspaceOf(role: string | undefined): SellWorkspace {
  return role === 'talent' || role === 'freelancer' || role === 'employer' ? role : 'seller';
}
