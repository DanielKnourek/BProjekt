import React, { ReactNode } from "react";

type LayoutProps = {
  children?: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-sky-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;
