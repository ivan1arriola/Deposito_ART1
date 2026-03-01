"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "!w-[min(420px,calc(100vw-24px))] !rounded-2xl !border !border-stone-200 !bg-white !px-4 !py-3 !shadow-[0_18px_45px_rgba(15,23,42,0.18)]",
          title: "!text-[15px] !font-semibold !leading-5",
          description: "!mt-1 !text-[13px] !leading-5 !text-stone-600",
          actionButton: "!rounded-xl",
          cancelButton: "!rounded-xl",
          closeButton: "!border-0 !bg-transparent !text-stone-500 hover:!bg-stone-100",
        },
      }}
    />
  );
}
