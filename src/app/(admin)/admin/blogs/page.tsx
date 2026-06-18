import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminBlogsPage() {
  return (
    <>
      <AdminHeader title="Blogs" />
      <div className="p-6">
        <Link href="/admin/blogs/new" className="btn-primary">New Post</Link>
      </div>
    </>
  );
}
