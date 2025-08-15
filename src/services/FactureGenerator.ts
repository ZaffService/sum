import type { IColis } from "../models/IColis"
import type { ICargaison } from "../models/Icargaison"

export interface IFactureDataColis {
  codeDeSuivi: string
  libelle: string
  poids: number
  type: string
  etatColis: string
}

export interface IFactureData {
  colis: IFactureDataColis
  cargaison: ICargaison
  expediteur: {
    nom: string
    prenom: string
    telephone: string
    adresse: string
    email?: string
  }
  destinataire: {
    nom: string
    prenom: string
    telephone: string
    adresse: string
  }
  prixCalcule: number
}

export class FactureGenerator {
  static genererFacturePDF(data: IFactureData): void {
    const modal = this.creerModalFacture(data)
    document.body.appendChild(modal)
    modal.classList.remove("opacity-0", "pointer-events-none")
  }

  private static creerModalFacture(data: IFactureData): HTMLElement {
    const modal = document.createElement("div")
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 pointer-events-none transition-all duration-300"
    modal.id = "factureModal"

    modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6 border-b pb-4">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">FACTURE DE TRANSPORT</h2>
                            <p class="text-gray-600">Reçu d'expédition</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-600">Date: ${new Date().toLocaleDateString("fr-FR")}</p>
                            <p class="text-sm text-gray-600">Heure: ${new Date().toLocaleTimeString("fr-FR")}</p>
                        </div>
                    </div>

                    <!-- Contenu de la facture -->
                    <div id="factureContent">
                        ${this.genererContenuFacture(data)}
                    </div>

                    <!-- Boutons d'action -->
                    <div class="flex justify-end space-x-4 mt-8 pt-4 border-t">
                        <button onclick="FactureGenerator.fermerModal()" 
                                class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            Fermer
                        </button>
                        <button onclick="FactureGenerator.telechargerPDF()" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            📄 Télécharger PDF
                        </button>
                    </div>
                </div>
            </div>
        `

    return modal
  }

  private static genererContenuFacture(data: IFactureData): string {
    return `
            <!-- 1. Informations sur le colis -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 bg-blue-50 p-3 rounded">
                    🔹 1. Informations sur le colis
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Code de suivi:</strong> ${data.colis.codeDeSuivi}</div>
                    <div><strong>Libellé:</strong> "${data.colis.libelle}"</div>
                    <div><strong>Poids:</strong> ${data.colis.poids} kg</div>
                    <div><strong>Type de produit:</strong> ${data.colis.type}</div>
                    <div><strong>Type de cargaison:</strong> ${data.cargaison.type}</div>
                    <div><strong>Prix à payer:</strong> <span class="text-green-600 font-bold">${data.prixCalcule.toLocaleString()} FCFA</span></div>
                    <div><strong>État actuel:</strong> <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">${data.colis.etatColis}</span></div>
                </div>
            </div>

            <!-- 2. Informations sur l'expéditeur -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 bg-green-50 p-3 rounded">
                    🔹 2. Informations sur l'expéditeur
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Nom:</strong> ${data.expediteur.nom}</div>
                    <div><strong>Prénom:</strong> ${data.expediteur.prenom}</div>
                    <div><strong>Téléphone:</strong> ${data.expediteur.telephone}</div>
                    <div><strong>Adresse:</strong> ${data.expediteur.adresse}</div>
                    ${data.expediteur.email ? `<div><strong>Email:</strong> ${data.expediteur.email}</div>` : ""}
                </div>
            </div>

            <!-- 3. Informations sur le destinataire -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 bg-purple-50 p-3 rounded">
                    🔹 3. Informations sur le destinataire
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Nom:</strong> ${data.destinataire.nom}</div>
                    <div><strong>Prénom:</strong> ${data.destinataire.prenom}</div>
                    <div><strong>Téléphone:</strong> ${data.destinataire.telephone}</div>
                    <div><strong>Adresse:</strong> ${data.destinataire.adresse}</div>
                </div>
            </div>

            <!-- 4. Informations sur la cargaison -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 bg-orange-50 p-3 rounded">
                    🔹 4. Informations sur la cargaison
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div><strong>Numéro de cargaison:</strong> ${data.cargaison.numero}</div>
                    <div><strong>Type:</strong> ${data.cargaison.type}</div>
                    <div><strong>État global:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">${data.cargaison.etatGlobal}</span></div>
                    <div><strong>État d'avancement:</strong> <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">${data.cargaison.etatAvancement}</span></div>
                    <div><strong>Lieu de départ:</strong> ${data.cargaison.lieuDepart.nom} (${data.cargaison.lieuDepart.latitude}, ${data.cargaison.lieuDepart.longitude})</div>
                    <div><strong>Lieu d'arrivée:</strong> ${data.cargaison.lieuArrivee.nom} (${data.cargaison.lieuArrivee.latitude}, ${data.cargaison.lieuArrivee.longitude})</div>
                    <div><strong>Distance estimée:</strong> ${data.cargaison.distance} km</div>
                </div>
            </div>

            <!-- Note importante -->
            <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p class="text-sm text-gray-700">
                    <strong>Note:</strong> Conservez ce reçu précieusement. Il vous sera demandé lors de la récupération de votre colis.
                    Le code de suivi sera envoyé au destinataire une fois la cargaison arrivée à destination.
                </p>
                <p class="text-sm text-gray-700 mt-2">
                    <strong>Prix calculé:</strong> ${data.prixCalcule.toLocaleString()} FCFA (minimum 10.000 FCFA)
                </p>
            </div>
        `
  }

  static fermerModal(): void {
    const modal = document.getElementById("factureModal")
    if (modal) {
      modal.classList.add("opacity-0", "pointer-events-none")
      setTimeout(() => {
        modal.remove()
      }, 300)
    }
  }

  static telechargerPDF(): void {
    const contenu = document.getElementById("factureContent")
    if (!contenu) return

    const fenetreImpression = window.open("", "_blank")
    if (!fenetreImpression) return

    fenetreImpression.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Facture de Transport</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .mb-8 { margin-bottom: 2rem; }
                    .mb-4 { margin-bottom: 1rem; }
                    .p-3 { padding: 0.75rem; }
                    .p-4 { padding: 1rem; }
                    .rounded { border-radius: 0.375rem; }
                    .bg-blue-50 { background-color: #eff6ff; }
                    .bg-green-50 { background-color: #f0fdf4; }
                    .bg-purple-50 { background-color: #faf5ff; }
                    .bg-orange-50 { background-color: #fff7ed; }
                    .bg-gray-50 { background-color: #f9fafb; }
                    .border-l-4 { border-left: 4px solid; }
                    .border-blue-500 { border-color: #3b82f6; }
                    .text-green-600 { color: #059669; }
                    .font-bold { font-weight: bold; }
                    .font-semibold { font-weight: 600; }
                    h2 { color: #1f2937; margin-bottom: 1rem; }
                    h3 { color: #374151; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <h2>FACTURE DE TRANSPORT - Reçu d'expédition</h2>
                <p>Date: ${new Date().toLocaleDateString("fr-FR")} - Heure: ${new Date().toLocaleTimeString("fr-FR")}</p>
                ${contenu.innerHTML}
            </body>
            </html>
        `)

    fenetreImpression.document.close()
    fenetreImpression.print()
    fenetreImpression.close()
  }
}
;(window as any).FactureGenerator = FactureGenerator
