import React, { ReactNode } from "react";
import Sidebar from "@components/Sidebar";

type LayoutProps = {
  children?: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Sidebar />

      <div className="p-4 sm:ml-64">
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
          {children}
        </div>
      </div>
    </>
  );
};

export default Layout;
