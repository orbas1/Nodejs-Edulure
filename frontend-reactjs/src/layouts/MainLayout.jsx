import { Fragment } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Disclosure, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Home', to: '/' },
  { name: 'Live Feed', to: '/feed' },
  { name: 'Search', to: '/search' },
  { name: 'Profile', to: '/profile' },
  { name: 'Admin', to: '/admin' }
];

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
              alt="Edulure logo"
              className="h-10 w-auto"
            />
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors duration-200 hover:text-primary-dark ${
                    isActive ? 'text-primary' : 'text-slate-600'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <NavLink
              to="/login"
              className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:border-primary hover:text-primary-dark"
            >
              Log in
            </NavLink>
            <NavLink
              to="/register"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              Join the Community
            </NavLink>
          </div>
          <Disclosure as="div" className="md:hidden">
            {({ open }) => (
              <>
                <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:border-primary hover:text-primary">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </Disclosure.Button>
                <Transition
                  as={Fragment}
                  enter="transition duration-200 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-150 ease-in"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="absolute inset-x-4 top-20 z-50 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur">
                    <div className="flex flex-col gap-4">
                      {navigation.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.to}
                          className={({ isActive }) =>
                            `text-base font-semibold ${
                              isActive ? 'text-primary' : 'text-slate-600'
                            }`
                          }
                        >
                          {item.name}
                        </NavLink>
                      ))}
                      <div className="mt-4 flex flex-col gap-3">
                        <NavLink
                          to="/login"
                          className="rounded-full border border-primary/30 px-5 py-2 text-center text-sm font-semibold text-primary hover:border-primary hover:text-primary-dark"
                        >
                          Log in
                        </NavLink>
                        <NavLink
                          to="/register"
                          className="rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
                        >
                          Join the Community
                        </NavLink>
                      </div>
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        </div>
      </header>
      <main className="bg-white">
        <Outlet key={location.pathname} />
      </main>
      <footer className="border-t border-slate-200 bg-slate-50/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Edulure. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
