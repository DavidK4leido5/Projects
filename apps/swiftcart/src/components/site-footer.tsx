import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/" },
      { label: "New arrivals", href: "/?sort=new" },
      // "Stores" used to sit here, copied onto the new-arrivals href: two rows
      // with one key, and a link that went to the wrong listing. There is no
      // public stores index yet (only /stores/[slug]), so it comes out until
      // that page exists.
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Open a store", href: "/signup/store" },
      { label: "Seller dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/signup" },
      { label: "Your orders", href: "/orders" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Link href="/" className="text-base font-semibold tracking-tight">
            SwiftCart
          </Link>
          <p className="max-w-[30ch] text-sm leading-6 text-neutral-600">
            Independent stores, one counter. No payment is taken here; an order records what was
            reserved.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-neutral-900">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span>SwiftCart demo. Built on Neon Postgres, Neon Auth, and object storage.</span>
          <span>No payments, no shipping, no tax.</span>
        </div>
      </div>
    </footer>
  );
}
