import React from "react";

const Merchandise = () => {
  return (
    <div className="bg-[var(--bg)] text-[var(--ink)] py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-screen">
      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold mb-8">
        Future Merchandise
      </h1>
      <p className="text-lg sm:text-xl lg:text-2xl mb-12 text-[var(--ink-soft)]">
        Check back soon for our latest products!
      </p>
    </div>
  );
};

export default Merchandise;
