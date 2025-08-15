import { EtatAvancement } from "../ApiLeaflet.js"
import { TypeColis } from "../enums/TypeColis.js"
import { EtatColis } from "../enumsColis/EtatColis.js"
import type { IColis } from "@/models/IColis"

interface ICargaison {
  id: string
  numero: string
  etatGlobal: string
  type: string
  colis: IColis[]
  poidsMax: number
  lieuDepart: {
    pays: string
  }
  lieuArrivee: {
    pays: string
  }
}

export class ColisManager {
  private endpoint = "http://localhost:3000/cargaisons"

  async getCargaisonsDisponibles(typeColis: string): Promise<ICargaison[]> {
    try {
      console.log("Recherche de cargaisons pour le type:", typeColis)
      const response = await fetch(this.endpoint)
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}. Vérifiez que json-server est démarré.`)
      }

      const cargaisons: ICargaison[] = await response.json()
      console.log("Toutes les cargaisons:", cargaisons)

      const cargaisonsDisponibles = cargaisons.filter((cargaison) => {
        // Une cargaison doit être OUVERTE pour recevoir des colis
        if (cargaison.etatGlobal !== "OUVERT") {
          console.log(`Cargaison ${cargaison.numero} fermée`)
          return false
        }

        // Vérifier la limite de 10 colis
        if (cargaison.colis && cargaison.colis.length >= 10) {
          console.log(`Cargaison ${cargaison.numero} pleine`)
          return false
        }

        // Vérifier la compatibilité du type de colis avec le type de cargaison
        if (!this.verifierCompatibilite(typeColis, cargaison.type)) {
          console.log(`Cargaison ${cargaison.numero} incompatible avec le type ${typeColis}`)
          return false
        }

        return true
      })

      console.log("Cargaisons disponibles:", cargaisonsDisponibles)
      return cargaisonsDisponibles
    } catch (error) {
      console.error("Erreur:", error)
      throw error
    }
  }

  async ajouterColisACargaison(cargaisonId: string, colisData: any): Promise<boolean> {
    try {
      console.log("Ajout colis à la cargaison:", cargaisonId, colisData)

      const response = await fetch(`${this.endpoint}/${cargaisonId}`)
      if (!response.ok) {
        throw new Error(`Cargaison non trouvée: ${response.status}`)
      }

      const cargaison: ICargaison = await response.json()
      console.log("Cargaison récupérée:", cargaison)

      if (cargaison.colis.length >= 10) {
        throw new Error("La cargaison est pleine (maximum 10 colis)")
      }

      if (cargaison.etatGlobal !== "OUVERT") {
        throw new Error("La cargaison est fermée")
      }

      const codeSuivi = await this.genererCodeSuiviSimple()

      const nouveauColis: IColis = {
        id: codeSuivi,
        libelle: colisData.libelle,
        poids: colisData.poids,
        type: this.mapperTypeColis(colisData.type),
        codeDeSuivi: codeSuivi,
        etatAvancement: EtatAvancement.EN_ATTENTE,
        etatColis: EtatColis.ARCHIVE,
        dateCreation: new Date(),
        destinataire: {
          nom: colisData.destinataire?.nom || "",
          prenom: colisData.destinataire?.prenom || "",
          telephone: colisData.destinataire?.telephone || "",
          email: colisData.destinataire?.email || "",
          adresse: colisData.destinataire?.adresse || "",
        },
      }

      console.log("Nouveau colis créé:", nouveauColis)

      cargaison.colis.push(nouveauColis)

      const updateResponse = await fetch(`${this.endpoint}/${cargaisonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cargaison),
      })

      if (!updateResponse.ok) {
        throw new Error(`Erreur lors de la mise à jour: ${updateResponse.status}`)
      }

      console.log("Colis ajouté avec succès")
      return true
    } catch (error) {
      console.error("Erreur lors de l'ajout du colis:", error)
      throw error
    }
  }

  private mapperTypeColis(typeString: string): TypeColis {
    const mapping: { [key: string]: TypeColis } = {
      alimentaire: TypeColis.ALIMENTAIRE,
      chimique: TypeColis.CHIMIQUE,
      "materiel-fragile": TypeColis.MATERIEL_FRAGILE,
      "materiel-incassable": TypeColis.MATERIEL_INCASSABLE,
    }

    const type = mapping[typeString.toLowerCase()]
    if (!type) {
      console.warn("Type de colis non reconnu:", typeString, "Utilisation du type ALIMENTAIRE par défaut")
      return TypeColis.ALIMENTAIRE
    }

    return type
  }

  private async genererCodeSuiviSimple(): Promise<string> {
    try {
      // Get all cargaisons to count total packages
      const response = await fetch(this.endpoint)
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      const cargaisons: ICargaison[] = await response.json()

      // Count total packages across all cargaisons
      let totalColis = 0
      cargaisons.forEach((cargaison) => {
        if (cargaison.colis && Array.isArray(cargaison.colis)) {
          totalColis += cargaison.colis.length
        }
      })

      // Generate simple tracking code: COL-1, COL-2, COL-3, etc.
      const nextNumber = totalColis + 1
      return `COL-${nextNumber}`
    } catch (error) {
      console.error("Erreur lors de la génération du code de suivi:", error)
      // Fallback to timestamp-based code if API fails
      const timestamp = Date.now().toString()
      return `COL-${timestamp.slice(-6)}`
    }
  }

  private verifierCompatibilite(typeColis: string, typeCargaison: string): boolean {
    console.log("Vérification compatibilité:", typeColis, typeCargaison)

    // Règles de compatibilité
    // Les colis fragiles ne peuvent pas aller en maritime
    if (typeColis === "MATERIEL_FRAGILE" && typeCargaison === "MARITIME") {
      return false
    }

    // Les colis chimiques ne peuvent aller qu'en maritime
    if (typeColis === "CHIMIQUE" && typeCargaison !== "MARITIME") {
      return false
    }

    // Les autres types sont compatibles avec tous les modes de transport
    return true
  }

  async renderCargaisons(cargaisons: ICargaison[]): Promise<void> {
    const container = document.getElementById("cargaisons-list")
    if (!container) return

    container.innerHTML = cargaisons
      .map(
        (cargaison) => `
            <div class="cargaison-item p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-cyan-400/50 cursor-pointer transition-all"
                 data-id="${cargaison.id}" 
                 data-type="${cargaison.type}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-cyan-400 font-semibold">${cargaison.numero}</span>
                    <span class="text-sm text-gray-400">${cargaison.type}</span>
                </div>
                <div class="text-sm text-gray-300">
                    ${cargaison.lieuDepart.pays} → ${cargaison.lieuArrivee.pays}
                </div>
                <div class="text-xs text-gray-400 mt-1">
                    ${cargaison.colis.length}/10 colis
                </div>
            </div>
        `,
      )
      .join("")

    // Ajouter les écouteurs d'événements pour la sélection
    document.querySelectorAll(".cargaison-item").forEach((item) => {
      item.addEventListener("click", () => this.selectCargaison(item as HTMLElement))
    })

    console.log("Cargaisons rendues avec événements attachés:", cargaisons.length)
  }

  private selectCargaison(element: HTMLElement): void {
    console.log("Sélection de cargaison via ColisManager")

    

    // Retirer la sélection précédente
    document
      .querySelectorAll(".cargaison-item")
      .forEach((item) => item.classList.remove("border-cyan-400", "bg-cyan-500/20"))

    // Ajouter la sélection au nouvel élément
    element.classList.add("border-cyan-400", "bg-cyan-500/20")

    // Déclencher un événement personnalisé pour notifier la sélection
    const event = new CustomEvent("cargaisonSelected", {
      detail: {
        id: element.dataset.id,
        type: element.dataset.type,
      },
    })
    document.dispatchEvent(event)
  }
}
