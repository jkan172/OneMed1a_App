import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * HomePage component that redirects users based on authentication status.
 * If the user is not authenticated (no userId cookie), they are redirected to the login page.
 * If authenticated, they are redirected to the movie page.
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) {
    redirect("/login");
  }
  redirect("/movie");
}
