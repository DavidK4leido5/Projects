import { Suspense } from "react";
import { Catalogue, type CatalogueSearch } from "@/components/catalogue";
import { CatalogueSkeleton } from "@/components/skeletons";
import { FeaturedHero } from "@/components/featured-hero";
import { imageSources } from "@/lib/cloudinary";
import { listFeaturedProducts } from "@/features/catalog/queries";

export const metadata = { title: "All products" };

export default async function Page({ searchParams }: { searchParams: Promise<CatalogueSearch> }) {
  // Cached read: keeps the hero inside the prerendered shell.
  const featured = await listFeaturedProducts();
  const heroSlides = featured.map((item) => {
    const art = imageSources(item.imageKey, 1600);
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      src: art ? art.src : "/api/images/" + item.imageKey,
      srcSet: art?.srcSet,
    };
  });

  return (
    <>
      {heroSlides.length > 0 ? <FeaturedHero slides={heroSlides} /> : null}

      <Suspense fallback={<CatalogueSkeleton />}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </>
  );
}
