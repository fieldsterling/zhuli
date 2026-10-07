import { AdminConsole } from "@/components/admin/admin-console";
import { adminUser } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await adminUser();

  if (!admin) {
    return (
      <div className="flex flex-col items-start p-5">
        <h1 className="text-xl font-semibold">平台管理后台</h1>
        <div className="glass mt-6 w-full rounded-2xl p-5 text-center">
          <p className="text-sm font-medium">无管理员权限</p>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted">
            平台管理需管理员身份。当前账号在 zhuli_users 中 role 非 admin，无法进入。
          </p>
        </div>
      </div>
    );
  }

  return <AdminConsole />;
}