import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DocumentSimulatorService {
  private readonly PDF_HEADER = '%PDF-1.5\n%¿÷¢\n';
  private readonly PDF_FOOTER = '\n%%EOF';
  
  constructor() { }
  
  /**
   * Génère un contenu PDF simulé pour tester l'application
   * @param documentId ID du document
   * @param documentType Type de document
   * @param isPreview Si true, génère une version allégée
   * @returns Blob contenant un PDF simulé
   */
  generateSimulatedPdf(documentId: string, documentType: string, isPreview: boolean = false): Blob {
    // Taille du document en fonction du type et du mode prévisualisation
    const pdfSize = isPreview ? this.getPreviewSize(documentType) : this.getFullSize(documentType);
    
    // Créer un contenu PDF minimal mais "réaliste"
    const content = this.createPdfContent(documentId, documentType, pdfSize, isPreview);
    
    // Créer un Blob avec le contenu PDF
    return new Blob([content], { type: 'application/pdf' });
  }
  
  /**
   * Crée un contenu PDF simulé
   */
  private createPdfContent(documentId: string, documentType: string, sizeInKB: number, isPreview: boolean): ArrayBuffer {
    // En-tête PDF minimaliste
    let content = this.PDF_HEADER;
    
    // Informations du document
    content += `
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length 5 0 R >>
stream
BT
/F1 12 Tf
50 700 Td
(Document ID: ${documentId}) Tj
0 -20 Td
(Type: ${documentType}) Tj
0 -20 Td
(Mode: ${isPreview ? 'Prévisualisation' : 'Document complet'}) Tj
0 -20 Td
(Taille: ${sizeInKB} KB) Tj
0 -40 Td
(Ce document est une simulation générée pour tester l'application.) Tj
`;

    // Ajouter des informations supplémentaires en fonction du type de document
    if (documentType.includes("mariage")) {
      content += `
0 -40 Td
(ACTE DE MARIAGE) Tj
0 -20 Td
(Entre M. DIALLO Ibrahim et Mme KEITA Aminata) Tj
0 -20 Td
(Date de mariage: 15/03/2023) Tj
`;
    } else if (documentType.includes("naissance")) {
      content += `
0 -40 Td
(DÉCLARATION DE NAISSANCE) Tj
0 -20 Td
(Enfant: COULIBALY Mamadou) Tj
0 -20 Td
(Né le: 10/04/2023 à Ségou) Tj
`;
    } else if (documentType.includes("jugement")) {
      content += `
0 -40 Td
(JUGEMENT SUPPLÉTIF) Tj
0 -20 Td
(Concernant: TRAORÉ Oumar) Tj
0 -20 Td
(Rendu le: 22/05/2023 au Tribunal de Kayes) Tj
`;
    }
    
    // Fermer le contenu du document
    content += `
ET
endstream
endobj

5 0 obj
${content.length}
endobj
`;

    // Ajouter du contenu supplémentaire pour atteindre la taille souhaitée
    const targetSize = sizeInKB * 1024;
    let paddingData = '';
    while ((content.length + paddingData.length + this.PDF_FOOTER.length) < targetSize) {
      paddingData += this.generateRandomPdfContent(100);
    }
    
    content += paddingData + this.PDF_FOOTER;
    
    // Convertir en ArrayBuffer pour simuler un téléchargement binaire
    return this.stringToArrayBuffer(content);
  }
  
  /**
   * Génère du contenu PDF aléatoire
   */
  private generateRandomPdfContent(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  /**
   * Convertit une chaîne en ArrayBuffer
   */
  private stringToArrayBuffer(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  
  /**
   * Taille estimée pour un aperçu selon le type de document
   */
  private getPreviewSize(documentType: string): number {
    // En KB
    switch (documentType) {
      case 'Acte de mariage': return 85;
      case 'Déclaration de naissance': return 65;
      case 'Jugement supplétif': return 120;
      default: return 75;
    }
  }
  
  /**
   * Taille estimée pour un document complet selon le type
   */
  private getFullSize(documentType: string): number {
    // En KB
    switch (documentType) {
      case 'Acte de mariage': return 750;
      case 'Déclaration de naissance': return 550;
      case 'Jugement supplétif': return 980;
      default: return 800;
    }
  }
}