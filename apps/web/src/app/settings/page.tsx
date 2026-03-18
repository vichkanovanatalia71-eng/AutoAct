"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/profile");
  }, [router]);

  return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
}
