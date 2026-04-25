'use client';

const Loader = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-sm font-bold uppercase tracking-widest text-gray-400">{text}</div>
  </div>
);

export default Loader;
