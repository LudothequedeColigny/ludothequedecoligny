/** Catalogue filtré sur le nom d'un jeu (la recherche du catalogue lit ?q=). */
export const lienCatalogue = nom => `/catalogue?q=${encodeURIComponent(nom)}`
