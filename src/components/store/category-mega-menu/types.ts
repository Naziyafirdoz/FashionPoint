import type { NavDropdownData } from "@/lib/categories/nav-dropdown";

export type CategoryMegaMenuCategory = Pick<
  NavDropdownData,
  "slug" | "name" | "href" | "description" | "image_url" | "banner_image_url"
>;
