import type { PlaceSlug } from "@/content/photos";

export interface Hotel {
  id: string;
  name: string;
  address: string;
  /** Adresse utilisée pour l'itinéraire Google Maps. */
  mapsQuery: string;
  officialUrl: string;
  /** Photographie libre de droits réellement disponible ; sinon un emplacement élégant est affiché. */
  photo?: PlaceSlug;
  /** Information vérifiée sur le site officiel de l'hôtel. */
  note: string;
}

// Adresses et sites vérifiés sur les sites officiels. Aucun tarif ni aucune disponibilité n'est affiché.
export const HOTELS: Hotel[] = [
  {
    id: "cabinn-city",
    name: "CABINN City",
    address: "Mitchellsgade 14, 1568 København V",
    mapsQuery: "CABINN City, Mitchellsgade 14, 1568 København V",
    officialUrl: "https://en.cabinn.com/hotel/cabinn-city",
    photo: "hotel-cabinn-city",
    note: "Au cœur de la ville, à quelques centaines de mètres de Tivoli et de la gare centrale (selon le site officiel).",
  },
  {
    id: "wakeup-bernstorffsgade",
    name: "Wakeup Copenhagen — Bernstorffsgade",
    address: "Bernstorffsgade 35, 1577 København V",
    mapsQuery: "Wakeup Copenhagen Bernstorffsgade 35, 1577 København V",
    officialUrl: "https://www.wakeupcopenhagen.com/the-hotels/copenhagen/bernstorffsgade/",
    note: "Près de la gare centrale, de Tivoli Gardens et du front de mer (selon le site officiel).",
  },
  {
    id: "meininger",
    name: "MEININGER Hotel Copenhagen",
    address: "Colbjørnsensgade 5-11, 1652 København V",
    mapsQuery: "MEININGER Hotel Copenhagen, Colbjørnsensgade 5-11, 1652 København V",
    officialUrl: "https://www.meininger-hotels.com/en/hotels/copenhagen/hotel-copenhagen/",
    note: "À Vesterbro : 4 minutes à pied de la gare centrale, 12 minutes à pied de la place de l'Hôtel de Ville (selon le site officiel).",
  },
];

export const routeToCityHall = (hotel: Hotel) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(hotel.mapsQuery)}&destination=${encodeURIComponent("Copenhagen City Hall, Rådhuspladsen 1, 1550 København")}&travelmode=walking`;

export const HOTELS_NEAR_CITY_HALL_URL = "https://www.google.com/maps/search/?api=1&query=hotels+near+Copenhagen+City+Hall+R%C3%A5dhuspladsen";
