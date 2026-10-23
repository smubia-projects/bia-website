/*
 * Route-change fade. A CSS animation (not framer-motion) so it runs on the
 * compositor from the very first paint: the server HTML is never stuck at
 * opacity 0 waiting for JS to hydrate, and no transform is left on the wrapper
 * (a transformed ancestor breaks `position: fixed` descendants like modals).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-content" tabIndex={-1} className="page-enter">
      {children}
    </div>
  );
}
