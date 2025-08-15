import type { EtatAvancement } from "@/ApiLeaflet"
import type { TypeColis } from "@/enums/TypeColis"
import type { EtatColis } from "@/enumsColis/EtatColis"

export interface IDestinataire {
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
}

export interface IColis {
  id?: string
  libelle: string
  poids: number
  type: TypeColis
  codeDeSuivi?: string
  etatAvancement: EtatAvancement
  etatColis: EtatColis
  dateCreation?: Date
  destinataire?: IDestinataire
}
