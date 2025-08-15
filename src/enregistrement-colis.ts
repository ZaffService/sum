import { ColisManager } from "./services/ColisManager.js"
import { FactureGenerator, type IFactureData } from "./services/FactureGenerator.js"
import type { ICargaison } from "./models/Icargaison"
interface ColisData {
  type: string
  poids: number
  libelle: string
  destinataire?: {
    nom: string
    prenom: string
    telephone: string
    email: string
    adresse: string
  }
}

interface CargaisonSelection {
  id: string
  type: string
}

class EnregistrementColis {
  private colisManager: ColisManager
  private selectedCargaisonData: CargaisonSelection | null = null
  private currentColisData: ColisData | null = null
  private modal: HTMLElement | null = null
  private confirmButton: HTMLButtonElement | null = null

  constructor() {
    console.log("EnregistrementColis initialisé")
    this.colisManager = new ColisManager()
    this.initializeEventListeners()
    this.initializeModals()
  }

  private initializeEventListeners(): void {
    console.log("Initialisation des événements")
    const typeSelect = document.getElementById("package-product-type") as HTMLSelectElement
    console.log("Select trouvé:", typeSelect)

    if (typeSelect) {
      typeSelect.addEventListener("change", async (e: Event) => {
        console.log("Changement de type détecté")
        const select = e.target as HTMLSelectElement
        const typeColis = select.value
        console.log("Type sélectionné:", typeColis)

        if (!typeColis) return

        try {
          const cargaisons = await this.colisManager.getCargaisonsDisponibles(typeColis)
          console.log("Cargaisons récupérées:", cargaisons)

          if (cargaisons.length === 0) {
            this.showError("Aucune cargaison disponible pour ce type de colis")
            select.value = ""
            return
          }

          if (this.modal) {
            this.renderCargaisons(cargaisons)
            this.modal.classList.remove("opacity-0", "pointer-events-none")
            console.log("Modal affiché")
          } else {
            console.error("Modal non trouvé")
          }
        } catch (error) {
          console.error("Erreur:", error)
          this.showError("Erreur lors du chargement des cargaisons")
          select.value = ""
        }
      })
    }

    // Gestion du formulaire principal
    const form = document.getElementById("register-package-form")
    if (form) {
      form.addEventListener("submit", (e: Event) => {
        e.preventDefault()
        this.validerEtEnregistrerColis()
      })
    }
  }

  private async ouvrirModalCargaisons(typeColis: string): Promise<void> {
    console.log("Ouverture du modal pour le type:", typeColis)

    if (!this.modal) {
      this.showError("Interface non disponible. Veuillez recharger la page.")
      return
    }

    try {
      // Afficher un indicateur de chargement
      this.afficherChargement(true)

      // Récupérer les cargaisons compatibles
      const cargaisons = await this.colisManager.getCargaisonsDisponibles(typeColis)
      console.log("Cargaisons récupérées:", cargaisons)

      this.afficherChargement(false)

      if (cargaisons.length === 0) {
        this.showWarning(
          "Aucune cargaison disponible",
          `Aucune cargaison ouverte n'est disponible pour les colis de type "${typeColis}". Créez d'abord une cargaison ou vérifiez les cargaisons existantes.`,
        )
        return
      }

      // Mettre à jour l'affichage du type sélectionné
      const typeDisplay = document.getElementById("colis-type-display")
      if (typeDisplay) {
        typeDisplay.textContent = this.formatTypeAffichage(typeColis)
      }

      // Afficher la liste des cargaisons
      this.renderCargaisons(cargaisons)

      // Ouvrir le modal
      this.modal.classList.remove("opacity-0", "pointer-events-none")
      console.log("Modal ouvert avec succès")
    } catch (error) {
      this.afficherChargement(false)
      console.error("Erreur lors du chargement des cargaisons:", error)
      this.showError("Erreur de connexion. Vérifiez que le serveur JSON est démarré (npm run json).")
    }
  }

  private formatTypeAffichage(type: string): string {
    const types: { [key: string]: string } = {
      ALIMENTAIRE: "Alimentaire",
      CHIMIQUE: "Chimique",
      MATERIEL_FRAGILE: "Matériel Fragile",
      MATERIEL_INCASSABLE: "Matériel Incassable",
    }
    return types[type] || type
  }

  private afficherChargement(afficher: boolean): void {
    const loadingEl = document.getElementById("cargaisons-loading")
    const listEl = document.getElementById("cargaisons-list")

    if (afficher) {
      if (loadingEl) loadingEl.classList.remove("hidden")
      if (listEl)
        listEl.innerHTML =
          '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Chargement des cargaisons...</div>'
    } else {
      if (loadingEl) loadingEl.classList.add("hidden")
    }
  }

  private async validerEtEnregistrerColis(): Promise<void> {
    // Récupérer les données du formulaire
    const typeSelect = document.getElementById("package-product-type") as HTMLSelectElement
    const poidsInput = document.getElementById("package-weight") as HTMLInputElement
    const libelleInput = document.getElementById("libelle-produit") as HTMLInputElement

    const nomInput = document.getElementById("client-nom") as HTMLInputElement
    const prenomInput = document.getElementById("client-prenom") as HTMLInputElement
    const telephoneInput = document.getElementById("client-phone") as HTMLInputElement
    const emailInput = document.getElementById("client-email") as HTMLInputElement
    const adresseInput = document.getElementById("client-address") as HTMLInputElement

    const colisData: ColisData = {
      type: typeSelect?.value || "",
      poids: Number(poidsInput?.value) || 0,
      libelle: libelleInput?.value?.trim() || "",
      destinataire: {
        nom: nomInput?.value?.trim() || "",
        prenom: prenomInput?.value?.trim() || "",
        telephone: telephoneInput?.value?.trim() || "",
        email: emailInput?.value?.trim() || "",
        adresse: adresseInput?.value?.trim() || "",
      },
    }

    // Validation des données
    if (!this.validerDonneesColis(colisData)) {
      return
    }

    // Récupérer l'ID de la cargaison depuis le champ caché
    const form = document.getElementById("register-package-form") as HTMLFormElement
    const hiddenInput = form?.querySelector('input[name="cargaison-id"]') as HTMLInputElement
    const cargaisonId = hiddenInput?.value

    if (!cargaisonId) {
      this.showError(
        "Veuillez d'abord sélectionner une cargaison en choisissant un type de colis et en confirmant votre sélection.",
      )
      return
    }

    try {
      console.log("Enregistrement du colis:", colisData, "dans la cargaison:", cargaisonId)

      const result = await this.colisManager.ajouterColisACargaison(cargaisonId, colisData)

      if (result) {
        const destinataireInfo =
          colisData.destinataire?.nom && colisData.destinataire?.prenom
            ? ` pour ${colisData.destinataire.prenom} ${colisData.destinataire.nom}`
            : ""

        this.showSuccessModal(
          "Colis enregistré avec succès !",
          `Le colis "${colisData.libelle}" (${colisData.poids}kg)${destinataireInfo} a été ajouté à la cargaison ${cargaisonId}`,
          result,
          cargaisonId
        )

        // Réinitialiser le formulaire
        this.reinitialiserFormulaire()
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error)
      this.showError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement du colis")
    }
  }

  private validerDonneesColis(data: ColisData): boolean {
    if (!data.type) {
      this.showError("Veuillez sélectionner un type de colis")
      return false
    }

    if (!data.libelle || data.libelle.length < 2) {
      this.showError("Veuillez saisir un libellé valide (minimum 2 caractères)")
      return false
    }

    if (!data.poids || data.poids <= 0) {
      this.showError("Veuillez saisir un poids valide (supérieur à 0)")
      return false
    }

    if (data.poids > 1000) {
      this.showWarning("Poids important", "Le poids saisi est très élevé. Veuillez vérifier.")
    }

    if (!data.destinataire?.nom || data.destinataire.nom.length < 2) {
      this.showError("Veuillez saisir le nom du destinataire (minimum 2 caractères)")
      return false
    }

    if (!data.destinataire?.prenom || data.destinataire.prenom.length < 2) {
      this.showError("Veuillez saisir le prénom du destinataire (minimum 2 caractères)")
      return false
    }

    if (!data.destinataire?.telephone || data.destinataire.telephone.length < 8) {
      this.showError("Veuillez saisir un numéro de téléphone valide")
      return false
    }

    if (!data.destinataire?.email || !this.validerEmail(data.destinataire.email)) {
      this.showError("Veuillez saisir une adresse email valide")
      return false
    }

    if (!data.destinataire?.adresse || data.destinataire.adresse.length < 10) {
      this.showError("Veuillez saisir une adresse complète (minimum 10 caractères)")
      return false
    }

    return true
  }

  private validerEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private initializeModals(): void {
    this.modal = document.getElementById("select-cargaison-modal")

    if (!this.modal) {
      console.error("Modal non trouvé dans le DOM")
      return
    }

    this.confirmButton = document.getElementById("confirm-selection") as HTMLButtonElement
    const cancelButton = document.getElementById("cancel-selection")
    const closeButton = document.getElementById("close-modal")

    // Gérer la confirmation de sélection
    this.confirmButton?.addEventListener("click", () => {
      console.log("Bouton confirmer cliqué")
      console.log("Cargaison sélectionnée:", this.selectedCargaisonData)

      if (this.selectedCargaisonData && this.currentColisData) {
        try {
          // Fermer le modal
          this.modal?.classList.add("opacity-0", "pointer-events-none")

          // Réactiver le formulaire pour finaliser l'enregistrement
          const form = document.getElementById("register-package-form") as HTMLFormElement
          if (form) {
            form.querySelector('button[type="submit"]')?.removeAttribute("disabled")
          }

          // Afficher un message de succès
          this.showSuccess(`La cargaison ${this.selectedCargaisonData.id} a été sélectionnée`)
        } catch (error) {
          console.error("Erreur lors de la confirmation:", error)
          this.showError("Une erreur est survenue lors de la sélection de la cargaison")
        }
      } else if (this.selectedCargaisonData) {
        // Si une cargaison est sélectionnée mais pas de données de colis
        console.log("Confirmation de sélection sans données de colis")

        try {
          // Stocker l'ID de la cargaison pour la soumission
          const form = document.getElementById("register-package-form") as HTMLFormElement
          if (form) {
            let hiddenInput = form.querySelector('input[name="cargaison-id"]') as HTMLInputElement
            if (!hiddenInput) {
              hiddenInput = document.createElement("input")
              hiddenInput.setAttribute("type", "hidden")
              hiddenInput.setAttribute("name", "cargaison-id")
              form.appendChild(hiddenInput)
            }
            hiddenInput.value = this.selectedCargaisonData.id
          }

          // Fermer le modal
          this.modal?.classList.add("opacity-0", "pointer-events-none")

          // Afficher un message de succès
          this.showSuccess(
            `Cargaison ${this.selectedCargaisonData.id} sélectionnée. Vous pouvez maintenant enregistrer le colis.`,
          )

          // Réinitialiser la sélection pour permettre une nouvelle sélection si nécessaire
          this.selectedCargaisonData = null
          if (this.confirmButton) {
            this.confirmButton.disabled = true
          }
        } catch (error) {
          console.error("Erreur lors de la confirmation:", error)
          this.showError("Une erreur est survenue lors de la sélection de la cargaison")
        }
      } else {
        console.log("Aucune cargaison sélectionnée")
        this.showError("Veuillez d'abord sélectionner une cargaison")
      }
    })

    // Gérer l'annulation et la fermeture
    const closeModal = () => {
      this.modal?.classList.add("opacity-0", "pointer-events-none")
      this.selectedCargaisonData = null
      if (this.confirmButton) {
        this.confirmButton.disabled = true
      }
    }

    cancelButton?.addEventListener("click", closeModal)
    closeButton?.addEventListener("click", closeModal)
  }

  private fermerModal(): void {
    if (this.modal) {
      this.modal.classList.add("opacity-0", "pointer-events-none")
    }
    this.selectedCargaisonData = null
    if (this.confirmButton) {
      this.confirmButton.disabled = true
    }
    console.log("Modal fermé")
  }

  private confirmerSelectionCargaison(): void {
    if (!this.selectedCargaisonData) {
      this.showError("Aucune cargaison sélectionnée")
      return
    }

    // Fermer le modal et permettre à l'utilisateur de compléter le formulaire
    this.fermerModal()

    // Afficher un message de confirmation
    this.showSuccess(
      `Cargaison ${this.selectedCargaisonData.id} sélectionnée. Complétez maintenant les informations du colis.`,
    )

    // Mettre le focus sur le champ poids si vide
    const poidsInput = document.getElementById("package-weight") as HTMLInputElement
    if (poidsInput && !poidsInput.value) {
      poidsInput.focus()
    }
  }

  private renderCargaisons(cargaisons: any[]): void {
    const list = document.getElementById("cargaisons-list")
    if (!list) {
      console.error("Liste des cargaisons non trouvée")
      return
    }

    if (cargaisons.length === 0) {
      list.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-inbox text-3xl mb-4"></i>
                    <p>Aucune cargaison disponible pour ce type de colis</p>
                </div>
            `
      return
    }

    list.innerHTML = cargaisons
      .map(
        (cargaison) => `
            <div class="cargaison-item bg-gray-600/30 p-4 rounded-lg hover:bg-gray-600/50 transition-colors cursor-pointer border border-transparent hover:border-cyan-400/50"
                 data-id="${cargaison.id}" data-numero="${cargaison.numero}" data-type="${cargaison.type}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-cyan-400 font-semibold text-lg">${cargaison.numero}</span>
                    <span class="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">${cargaison.type}</span>
                </div>
                <div class="text-sm text-gray-300 mb-2">
                    <i class="fas fa-route mr-2"></i>${cargaison.lieuDepart.pays} → ${cargaison.lieuArrivee.pays}
                </div>
                <div class="flex items-center justify-between text-xs text-gray-400">
                    <span><i class="fas fa-boxes mr-1"></i>${cargaison.colis?.length || 0}/10 colis</span>
                    <span><i class="fas fa-weight mr-1"></i>${cargaison.poidsMax}kg max</span>
                    <span class="text-green-400"><i class="fas fa-unlock mr-1"></i>OUVERT</span>
                </div>
            </div>
        `,
      )
      .join("")

    // Ajouter les écouteurs d'événements
    list.querySelectorAll(".cargaison-item").forEach((item) => {
      item.addEventListener("click", () => this.selectionnerCargaison(item as HTMLElement))
    })

    console.log("Cargaisons rendues:", cargaisons.length)
  }

  private selectionnerCargaison(item: HTMLElement): void {
    const id = item.dataset.id
    const numero = item.dataset.numero
    const type = item.dataset.type

    if (!id || !type) {
      console.error("Données de cargaison manquantes")
      return
    }

    console.log("Cargaison sélectionnée:", { id, numero, type })

    // Désélectionner tous les autres éléments
    document.querySelectorAll(".cargaison-item").forEach((el) => {
      el.classList.remove("bg-cyan-500/20", "border-cyan-400")
      el.classList.add("border-transparent")
    })

    // Sélectionner l'élément actuel
    item.classList.add("bg-cyan-500/20", "border-cyan-400")
    item.classList.remove("border-transparent")

    this.selectedCargaisonData = { id, type }

    if (this.confirmButton) {
      this.confirmButton.disabled = false
      this.confirmButton.classList.remove("opacity-50", "cursor-not-allowed")
      this.confirmButton.classList.add("hover:bg-cyan-600")
    }

    console.log("Cargaison sélectionnée, prêt pour confirmation")
  }

  private async showSuccessModal(title: string, message: string, colisResult?: any, cargaisonId?: string): Promise<void> {
    // Créer le toast de succès
    this.creerToast("success", title, message)
    
    // Si on a les données nécessaires, proposer de générer la facture
    if (colisResult && cargaisonId) {
      setTimeout(() => {
        this.proposerGenerationFacture(colisResult, cargaisonId)
      }, 2000) // Attendre 2 secondes après le toast
    }
  }

  private async proposerGenerationFacture(colisResult: any, cargaisonId: string): Promise<void> {
    try {
      // Récupérer les données de la cargaison
      const response = await fetch(`http://localhost:3000/cargaisons/${cargaisonId}`)
      if (!response.ok) {
        throw new Error('Impossible de récupérer les données de la cargaison')
      }
      
      const cargaison: ICargaison = await response.json()
      
      // Créer le modal de proposition de facture
      this.creerModalFacture(colisResult, cargaison)
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données pour la facture:', error)
      this.showError('Impossible de générer la facture automatiquement')
    }
  }

  private creerModalFacture(colis: any, cargaison: ICargaison): void {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300'
    modal.id = 'facture-proposal-modal'
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-cyan-400/30">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-receipt text-green-400 text-2xl"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Colis enregistré avec succès !</h3>
          <p class="text-gray-400">Voulez-vous générer la facture maintenant ?</p>
        </div>
        
        <div class="bg-gray-700/50 rounded-lg p-4 mb-6">
          <div class="text-sm text-gray-300 space-y-1">
            <p><span class="font-semibold">Colis:</span> ${colis.libelle}</p>
            <p><span class="font-semibold">Code:</span> ${colis.codeDeSuivi}</p>
            <p><span class="font-semibold">Poids:</span> ${colis.poids} kg</p>
            <p><span class="font-semibold">Cargaison:</span> ${cargaison.numero}</p>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button id="skip-facture" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
            Plus tard
          </button>
          <button id="generate-facture" class="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
            <i class="fas fa-receipt mr-2"></i>Générer
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Événements
    const skipBtn = modal.querySelector('#skip-facture')
    const generateBtn = modal.querySelector('#generate-facture')
    
    skipBtn?.addEventListener('click', () => {
      modal.remove()
    })
    
    generateBtn?.addEventListener('click', () => {
      this.genererFacture(colis, cargaison)
      modal.remove()
    })
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  private genererFacture(colis: any, cargaison: ICargaison): void {
    try {
      // Calculer le prix (logique simplifiée)
      const prixBase = 10000 // Prix minimum
      const prixCalcule = Math.max(prixBase, colis.poids * 100 * (cargaison.distance / 1000))
      
      // Récupérer les données du formulaire pour l'expéditeur
      const nomInput = document.getElementById("client-nom") as HTMLInputElement
      const prenomInput = document.getElementById("client-prenom") as HTMLInputElement
      const telephoneInput = document.getElementById("client-phone") as HTMLInputElement
      const emailInput = document.getElementById("client-email") as HTMLInputElement
      const adresseInput = document.getElementById("client-address") as HTMLInputElement
      
      const factureData: IFactureData = {
        colis: {
          codeDeSuivi: colis.codeDeSuivi || colis.id,
          libelle: colis.libelle,
          poids: colis.poids,
          type: colis.type,
          etatColis: colis.etatColis || 'ARCHIVE'
        },
        cargaison: cargaison,
        expediteur: {
          nom: nomInput?.value || 'Non spécifié',
          prenom: prenomInput?.value || 'Non spécifié',
          telephone: telephoneInput?.value || 'Non spécifié',
          adresse: adresseInput?.value || 'Non spécifiée',
          email: emailInput?.value || undefined
        },
        destinataire: {
          nom: colis.destinataire?.nom || 'Non spécifié',
          prenom: colis.destinataire?.prenom || 'Non spécifié',
          telephone: colis.destinataire?.telephone || 'Non spécifié',
          adresse: colis.destinataire?.adresse || 'Non spécifiée'
        },
        prixCalcule: prixCalcule
      }
      
      // Générer la facture
      FactureGenerator.genererFacturePDF(factureData)
      
      this.showSuccess('Facture générée avec succès !')
      
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error)
      this.showError('Erreur lors de la génération de la facture')
    }
  }

  private showError(message: string): void {
    this.creerToast("error", "Erreur", message)
  }

  private showWarning(title: string, message: string): void {
    this.creerToast("warning", title, message)
  }

  private showSuccess(message: string): void {
    this.creerToast("success", "Succès", message)
  }

  private showInfo(message: string): void {
    this.creerToast("info", "Information", message)
  }

  private creerToast(type: "success" | "error" | "warning" | "info", title: string, message: string): void {
    const toastContainer = document.getElementById("toast-root") || this.creerContainerToast()

    const couleurs = {
      success: "bg-green-600 border-green-500",
      error: "bg-red-600 border-red-500",
      warning: "bg-yellow-600 border-yellow-500",
      info: "bg-blue-600 border-blue-500",
    }

    const icones = {
      success: "fa-check-circle",
      error: "fa-exclamation-triangle",
      warning: "fa-exclamation-circle",
      info: "fa-info-circle",
    }

    const toast = document.createElement("div")
    toast.className = `${couleurs[type]} border-l-4 text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-in mb-3`
    toast.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas ${icones[type]} text-white"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-bold">${title}</h3>
                    <p class="text-sm mt-1">${message}</p>
                </div>
                <button onclick="this.parentElement?.parentElement?.remove()" class="ml-auto text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `

    toastContainer.appendChild(toast)

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 5000)
  }

  private creerContainerToast(): HTMLElement {
    let container = document.getElementById("toast-root")
    if (!container) {
      container = document.createElement("div")
      container.id = "toast-root"
      container.className = "fixed top-4 right-4 z-50 space-y-3"
      document.body.appendChild(container)
    }
    return container
  }

  private reinitialiserFormulaire(): void {
    const form = document.getElementById("register-package-form") as HTMLFormElement
    if (form) {
      form.reset()
      const hiddenInput = form.querySelector('input[name="cargaison-id"]') as HTMLInputElement
      if (hiddenInput) {
        hiddenInput.value = ""
      }
    }
    const typeSelect = document.getElementById("package-product-type") as HTMLSelectElement
    if (typeSelect) {
      typeSelect.value = ""
    }
  }
}

// Initialiser la classe quand le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM chargé, initialisation de EnregistrementColis")
  new EnregistrementColis()
})
