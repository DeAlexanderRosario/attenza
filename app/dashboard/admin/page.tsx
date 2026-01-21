import { getDashboardStats } from "@/app/actions/admin"
import { DashboardClient } from "@/components/admin/dashboard-client"

export default async function AdminDashboardPage() {
  // Fetch Real Data server-side (Initial State)
  const stats = await getDashboardStats()

  return <DashboardClient initialData={stats} />
}
