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
    const wide = imageSources(item.bannerWideKey, 1920);
    const tall = imageSources(item.bannerTallKey, 1080);
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      wideSrc: wide ? wide.src : "/api/images/" + item.bannerWideKey,
      wideSrcSet: wide?.srcSet,
      tallSrc: tall ? tall.src : "/api/images/" + item.bannerTallKey,
      tallSrcSet: tall?.srcSet,
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
