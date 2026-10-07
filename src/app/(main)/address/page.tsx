"use client";

import Link from "next/link";
import { AddressManager } from "@/components/address/address-manager";

export default function AddressPage() {
  return (
    <div className="px-5 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">收货地址</h1>
        <Link href="/profile" className="text-sm text-muted">返回</Link>
      </div>
      <div className="mt-5">
        <AddressManager />
      </div>
    </div>
  );
}