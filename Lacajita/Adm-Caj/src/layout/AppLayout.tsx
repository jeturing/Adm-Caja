import React from "react";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";

interface AppLayoutProps {
  children?: React.ReactNode;
}

const InnerLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isExpanded, isMobileOpen } = useSidebar();

  // When sidebar is fixed, add a left margin to the main content so it isn't
  // overlapped. Use responsive classes: on medium+ screens we reserve space,
  // on small screens the mobile sidebar overlays and we don't add margin.
  const leftMarginClass = isMobileOpen
    ? ""
    : isExpanded
    ? "md:ml-[290px]"
    : "md:ml-[90px]";

  return (
    <div className={`relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden ${leftMarginClass}`}>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <InnerLayout>{children}</InnerLayout>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
