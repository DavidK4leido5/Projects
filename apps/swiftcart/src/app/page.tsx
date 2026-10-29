import { Suspense } from "react";
import { Catalogue, type CatalogueSearch } from "@/components/catalogue";
import { CatalogueSkeleton } from "@/components/skeletons";
import { FeaturedHero } from "@/components/featured-hero";
import { getImageProps } from "next/image";
import { listFeaturedProducts } from "@/features/catalog/queries";

export const metadata = { title: "All products" };

export default async function Page({ searchParams }: { searchParams: Promise<CatalogueSearch> }) {
  // Cached read: keeps the hero inside the prerendered shell.
  const featured = await listFeaturedProducts();

  // getImageProps lets <picture> art-direct while next/image still builds the
  // srcset, so each screen gets its own crop at the right width.
  const heroSlides = featured.map((item) => {
    const wide = getImageProps({
      src: item.bannerWideKey,
      alt: item.name,
      width: 1920,
      height: 1080,
      sizes: "100vw",
    }).props;

    const tall = getImageProps({
      src: item.bannerTallKey,
      alt: item.name,
      width: 1080,
      height: 1920,
      sizes: "100vw",
    }).props;

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      wideSrcSet: wide.srcSet,
      tallSrc: tall.src,
      tallSrcSet: tall.srcSet,
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
