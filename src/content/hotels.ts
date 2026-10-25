import type { PlaceSlug } from "@/content/photos";

export interface Hotel {
  id: string;
  name: string;
  address: string;
  officialUrl: string;
  /** Photographie libre de droits réellement disponible ; sinon un emplacement élégant est affiché. */
  photo?: PlaceSlug;
}

// Adresses et sites vérifiés sur les sites officiels. Aucun tarif ni aucune disponibilité n'est affiché.
export const HOTELS: Hotel[] = [
  {
    id: "cabinn-city",
    name: "CABINN City",
    address: "Mitchellsgade 14, 1568 København V",
    officialUrl: "https://en.cabinn.com/hotel/cabinn-city",
    photo: "hotel-cabinn-city",
  },
  {
    id: "cabinn-copenhagen",
    name: "CABINN Copenhagen",
    address: "Arni Magnussons Gade 1, 1577 København V",
    officialUrl: "https://en.cabinn.com/hotel/cabinn-copenhagen",
  },
  {
    id: "meininger",
    name: "MEININGER Hotel Copenhagen",
    address: "Colbjørnsensgade 5-11, 1652 København V",
    officialUrl: "https://www.meininger-hotels.com/en/hotels/copenhagen/hotel-copenhagen/",
  },
  {
    id: "wakeup-bernstorffsgade",
    name: "Wakeup Copenhagen — Bernstorffsgade",
    address: "Bernstorffsgade 35, 1577 København V",
    officialUrl: "https://www.wakeupcopenhagen.com/the-hotels/copenhagen/bernstorffsgade/",
  },
];
