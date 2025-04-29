import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private regions = [
        { id: 1, nom: 'Kayes' },
        { id: 2, nom: 'Sikasso' },
        { id: 3, nom: 'Koulikoro' },
        { id: 4, nom: 'Ségou' },
        { id: 5, nom: 'Mopti' },
        { id: 6, nom: 'District de Bamako' }
    ];

    private cercles = [
        { id: 1, nom: 'Bafoulabé', region_id: 1 },
        { id: 2, nom: 'Kayes', region_id: 1 },
        { id: 3, nom: 'Kadiolo', region_id: 2 },
        { id: 4, nom: 'Kolondiéba', region_id: 2 },
        { id: 5, nom: 'Kati', region_id: 3 },
        { id: 6, nom: 'Koulikoro', region_id: 3 },
        { id: 7, nom: 'Ségou', region_id: 4 },
        { id: 8, nom: 'Barouéli', region_id: 4 },
        { id: 9, nom: 'Mopti', region_id: 5 },
        { id: 10, nom: 'Bandiagara', region_id: 5 },
        { id: 11, nom: 'Commune I', region_id: 6 },
        { id: 12, nom: 'Commune II', region_id: 6 },
        { id: 13, nom: 'Commune III', region_id: 6 },
        { id: 14, nom: 'Commune IV', region_id: 6 },
        { id: 15, nom: 'Commune V', region_id: 6 },
        { id: 16, nom: 'Commune VI', region_id: 6 }
    ];

    private communes = [
        { id: 1, nom: 'Bafoulabe', cercle_id: 1 },
        { id: 2, nom: 'Koussane', cercle_id: 2 },
        { id: 3, nom: 'Dioumatene', cercle_id: 3 },
        { id: 4, nom: 'Kadiana', cercle_id: 4 },
        { id: 5, nom: 'Kati', cercle_id: 5 },
        { id: 6, nom: 'Koulikoro', cercle_id: 6 },
        { id: 7, nom: 'Ségou', cercle_id: 7 },
        { id: 8, nom: 'Barouéli', cercle_id: 8 },
        { id: 9, nom: 'Mopti', cercle_id: 9 },
        { id: 10, nom: 'Bandiagara', cercle_id: 10 },
        { id: 11, nom: 'Banconi', cercle_id: 11 },
        { id: 12, nom: 'Hippodrome', cercle_id: 12 },
        { id: 13, nom: 'Bamako-Coura', cercle_id: 13 },
        { id: 14, nom: 'Lafiabougou', cercle_id: 14 },
        { id: 15, nom: 'Kalaban-Coro', cercle_id: 15 },
        { id: 16, nom: 'Magnambougou', cercle_id: 16 }
    ];

    private centresEtatCivil = [
        { id: 1, nom: 'BAFOULABE', commune_id: 1 },
        { id: 2, nom: 'KOUSSANE', commune_id: 2 },
        { id: 3, nom: 'DIOUMATENE', commune_id: 3 },
        { id: 4, nom: 'KADIANA', commune_id: 4 },
        { id: 5, nom: 'KATI', commune_id: 5 },
        { id: 6, nom: 'KOULIKORO', commune_id: 6 },
        { id: 7, nom: 'SEGOU', commune_id: 7 },
        { id: 8, nom: 'BAROELI', commune_id: 8 },
        { id: 9, nom: 'MOPTI', commune_id: 9 },
        { id: 10, nom: 'BANDIAGARA', commune_id: 10 },
        { id: 11, nom: 'BANCONI', commune_id: 11 },
        { id: 12, nom: 'HIPPODROME', commune_id: 12 },
        { id: 13, nom: 'BAMAKO-COURA', commune_id: 13 },
        { id: 14, nom: 'LAFIABOUGOU', commune_id: 14 },
        { id: 15, nom: 'KALABAN-CORO', commune_id: 15 },
        { id: 16, nom: 'MAGNAMBOUGOU', commune_id: 16 }
    ];

    private centresDeclaration = [
        { id: 1, nom: 'Csref_bafoulabe', commune_id: 1 },
        { id: 2, nom: 'Csref_koussane', commune_id: 2 },
        { id: 3, nom: 'Csref_dioumatene', commune_id: 3 },
        { id: 4, nom: 'Csref_kadiana', commune_id: 4 },
        { id: 5, nom: 'Csref_kati', commune_id: 5 },
        { id: 6, nom: 'Csref_koulikoro', commune_id: 6 },
        { id: 7, nom: 'Csref_segou', commune_id: 7 },
        { id: 8, nom: 'Csref_baroeli', commune_id: 8 },
        { id: 9, nom: 'Csref_mopti', commune_id: 9 },
        { id: 10, nom: 'Csref_bandiagara', commune_id: 10 },
        { id: 11, nom: 'Csref_banconi', commune_id: 11 },
        { id: 12, nom: 'Csref_hippodrome', commune_id: 12 },
        { id: 13, nom: 'Csref_bamako_coura', commune_id: 13 },
        { id: 14, nom: 'Csref_lafiabougou', commune_id: 14 },
        { id: 15, nom: 'Csref_kalaban_coro', commune_id: 15 },
        { id: 16, nom: 'Csref_magnambougou', commune_id: 16 }
    ];

    private tribunaux = [
        { id: 1, nom: "Tribunal d'instance de Bafoulabé", commune_id: 1 },
        { id: 2, nom: "Tribunal de Grande Instance de Kayes", commune_id: 2 },
        { id: 3, nom: "Tribunal de Grande Instance de Sikasso", commune_id: 3 },
        { id: 4, nom: "Tribunal d'instance de Kolondiéba", commune_id: 4 },
        { id: 5, nom: "Tribunal d'instance de Kati", commune_id: 5 },
        { id: 6, nom: "Tribunal de Grande Instance de Koulikoro", commune_id: 6 },
        { id: 7, nom: "Tribunal de Grande Instance de Ségou", commune_id: 7 },
        { id: 8, nom: "Tribunal d'instance de Barouéli", commune_id: 8 },
        { id: 9, nom: "Tribunal de Grande Instance de Mopti", commune_id: 9 },
        { id: 10, nom: "Tribunal d'instance de Bandiagara", commune_id: 10 },
        { id: 11, nom: "Tribunal d'instance de Commune I", commune_id: 11 },
        { id: 12, nom: "Tribunal d'instance de Commune II", commune_id: 12 },
        { id: 13, nom: "Tribunal d'instance de Commune III", commune_id: 13 },
        { id: 14, nom: "Tribunal d'instance de Commune IV", commune_id: 14 },
        { id: 15, nom: "Tribunal d'instance de Commune V", commune_id: 15 },
        { id: 16, nom: "Tribunal d'instance de Commune VI", commune_id: 16 }
    ];

    private documents = [
        {
            id: 1,
            nom_origine: 'Acte de naissance de Koulibaly',
            nom: 'encrypted_123456.pdf',
            chemin: '/assets/archives/acte_de_naissance/Mli1844.pdf',
            type_doc: 'Acte de naissance',
            date_creation: new Date('2025-04-23'),
            date_derniere_modification: new Date('2025-04-23'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 1,
            utilisateur_createur: 4,
            utilisateur_dernier_modificateur: 2,
            version: 1,
            concerne_1: 'Koulibaly',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 2,
            nom_origine: 'Acte de naissance de Boufal',
            nom: 'encrypted_234567.pdf',
            chemin: '/assets/archives/acte_de_naissance/Mli184413.pdf',
            type_doc: 'Acte de naissance',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 2,
            utilisateur_createur: 4,
            utilisateur_dernier_modificateur: 4,
            version: 1,
            concerne_1: 'Boufal',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 3,
            nom_origine: 'Acte de décès de Mouraïnou',
            nom: 'encrypted_345678.pdf',
            chemin: '/assets/archives/acte_de_deces/Mli1844.pdf',
            type_doc: 'Acte de décès',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 1,
            utilisateur_createur: 3,
            utilisateur_dernier_modificateur: 3,
            version: 2,
            concerne_1: 'Mouraïnou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 4,
            nom_origine: 'Acte de décès de Cheikou Konaté',
            nom: 'encrypted_456789.pdf',
            chemin: '/assets/archives/acte_de_deces/Mli184413.pdf',
            type_doc: 'Acte de décès',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 1,
            utilisateur_createur: 3,
            utilisateur_dernier_modificateur: 3,
            version: 2,
            concerne_1: 'Cheikou Konaté',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 5,
            nom_origine: 'Acte de mariage de Bamba & Adama',
            nom: 'encrypted_567890.pdf',
            chemin: '/assets/archives/acte_de_mariage/Mli1844.pdf',
            type_doc: 'Acte de mariage',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 1,
            utilisateur_createur: 7,
            utilisateur_dernier_modificateur: 7,
            version: 3,
            concerne_1: 'Bamba',
            concerne_2: 'Adama',
            supprime: 0,
            size: 175
        },
        {
            id: 6,
            nom_origine: 'Acte de mariage de Adamou & Fatimata',
            nom: 'encrypted_678901.pdf',
            chemin: '/assets/archives/acte_de_mariage/Mli184413.pdf',
            type_doc: 'Acte de mariage',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 1,
            utilisateur_createur: 7,
            utilisateur_dernier_modificateur: 7,
            version: 3,
            concerne_1: 'Adamou',
            concerne_2: 'Fatimata',
            supprime: 0,
            size: 175
        },
        {
            id: 7,
            nom_origine: 'Certificat de décès de Konaté',
            nom: 'encrypted_789012.pdf',
            chemin: '/assets/archives/certificat_de_deces/Mli1844.pdf',
            type_doc: 'Certificat de décès',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 1,
            utilisateur_createur: 9,
            utilisateur_dernier_modificateur: 9,
            version: 1,
            concerne_1: 'Konaté',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 8,
            nom_origine: 'Certificat de décès de Seydou',
            nom: 'encrypted_890123.pdf',
            chemin: '/assets/archives/certificat_de_deces/Mli184413.pdf',
            type_doc: 'Certificat de décès',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 1,
            utilisateur_createur: 9,
            utilisateur_dernier_modificateur: 9,
            version: 1,
            concerne_1: 'Seydou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 9,
            nom_origine: 'Certificat de non opposition 1',
            nom: 'encrypted_901234.pdf',
            chemin: '/assets/archives/certificat_de_non_opposition/Mli1844.pdf',
            type_doc: 'Certificat de non opposition',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Tribunal',
            institution_source_id: 1,
            utilisateur_createur: 8,
            utilisateur_dernier_modificateur: 8,
            version: 1,
            concerne_1: 'Certificat de non opposition 1',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 10,
            nom_origine: 'Certificat de non opposition 2',
            nom: 'encrypted_012345.pdf',
            chemin: '/assets/archives/certificat_de_non_opposition/Mli184413.pdf',
            type_doc: 'Certificat de non opposition',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Tribunal',
            institution_source_id: 1,
            utilisateur_createur: 8,
            utilisateur_dernier_modificateur: 8,
            version: 1,
            concerne_1: 'Certificat de non opposition 2',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 11,
            nom_origine: 'Déclaration de naissance de Ibrahim',
            nom: 'encrypted_123456.pdf',
            chemin: '/assets/archives/declaration_de_naissance/Mli1844.pdf',
            type_doc: 'Déclaration de naissance',
            date_creation: new Date('2025-04-23'),
            date_derniere_modification: new Date('2025-04-23'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 2,
            utilisateur_createur: 4,
            utilisateur_dernier_modificateur: 4,
            version: 1,
            concerne_1: 'Ibrahim',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 12,
            nom_origine: 'Déclaration de naissance de Aïssata',
            nom: 'encrypted_234567.pdf',
            chemin: '/assets/archives/declaration_de_naissance/Mli184413.pdf',
            type_doc: 'Déclaration de naissance',
            date_creation: new Date('2025-04-23'),
            date_derniere_modification: new Date('2025-04-23'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 2,
            utilisateur_createur: 4,
            utilisateur_dernier_modificateur: 4,
            version: 1,
            concerne_1: 'Aïssata',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 13,
            nom_origine: 'Déclaration de décès de Moussa',
            nom: 'encrypted_345678.pdf',
            chemin: '/assets/archives/declaration_de_deces/Mli1844.pdf',
            type_doc: 'Déclaration de décès',
            date_creation: new Date('2025-04-23'),
            date_derniere_modification: new Date('2025-04-23'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 3,
            utilisateur_createur: 5,
            utilisateur_dernier_modificateur: 5,
            version: 1,
            concerne_1: 'Moussa',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 14,
            nom_origine: 'Déclaration de décès de Aminata',
            nom: 'encrypted_456789.pdf',
            chemin: '/assets/archives/declaration_de_deces/Mli184413.pdf',
            type_doc: 'Déclaration de décès',
            date_creation: new Date('2025-04-23'),
            date_derniere_modification: new Date('2025-04-23'),
            institution_source: 'Centre de déclaration',
            institution_source_id: 3,
            utilisateur_createur: 5,
            utilisateur_dernier_modificateur: 5,
            version: 1,
            concerne_1: 'Aminata',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 15,
            nom_origine: 'Fiche de non inscription de Oumar',
            nom: 'encrypted_567890.pdf',
            chemin: '/assets/archives/fiche_de_non_inscription/Mli1844.pdf',
            type_doc: 'Fiche de non inscription',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 4,
            utilisateur_createur: 6,
            utilisateur_dernier_modificateur: 6,
            version: 1,
            concerne_1: 'Oumar',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 16,
            nom_origine: 'Fiche de non inscription de Fatoumata',
            nom: 'encrypted_678901.pdf',
            chemin: '/assets/archives/fiche_de_non_inscription/Mli184413.pdf',
            type_doc: 'Fiche de non inscription',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 4,
            utilisateur_createur: 6,
            utilisateur_dernier_modificateur: 6,
            version: 1,
            concerne_1: 'Fatoumata',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 17,
            nom_origine: 'Jugement supplétif de Sekou',
            nom: 'encrypted_789012.pdf',
            chemin: '/assets/archives/jugement_suppletif/Mli1844.pdf',
            type_doc: 'Jugement supplétif',
            date_creation: new Date('2025-04-22'),
            date_derniere_modification: new Date('2025-04-22'),
            institution_source: 'Tribunal',
            institution_source_id: 2,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Sekou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 18,
            nom_origine: 'Jugement supplétif de Mariam',
            nom: 'encrypted_890123.pdf',
            chemin: '/assets/archives/jugement_suppletif/Mli184413.pdf',
            type_doc: 'Jugement supplétif',
            date_creation: new Date('2025-04-22'),
            date_derniere_modification: new Date('2025-04-22'),
            institution_source: 'Tribunal',
            institution_source_id: 2,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Mariam',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 19,
            nom_origine: 'Jugement rectificatif de Ahmed',
            nom: 'encrypted_901234.pdf',
            chemin: '/assets/archives/jugement_rectificatif/Mli1844.pdf',
            type_doc: 'Jugement rectificatif',
            date_creation: new Date('2025-04-22'),
            date_derniere_modification: new Date('2025-04-22'),
            institution_source: 'Tribunal',
            institution_source_id: 3,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Ahmed',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 20,
            nom_origine: 'Jugement rectificatif de Kadiatou',
            nom: 'encrypted_012345.pdf',
            chemin: '/assets/archives/jugement_rectificatif/Mli184413.pdf',
            type_doc: 'Jugement rectificatif',
            date_creation: new Date('2025-04-22'),
            date_derniere_modification: new Date('2025-04-22'),
            institution_source: 'Tribunal',
            institution_source_id: 3,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Kadiatou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 21,
            nom_origine: 'Jugement d\'annulation de Sékou',
            nom: 'encrypted_123456.pdf',
            chemin: '/assets/archives/jugement_d_annulation/Mli1844.pdf',
            type_doc: 'Jugement d\'annulation',
            date_creation: new Date('2025-04-21'),
            date_derniere_modification: new Date('2025-04-21'),
            institution_source: 'Tribunal',
            institution_source_id: 4,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Sékou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 22,
            nom_origine: 'Jugement d\'annulation de Hawa',
            nom: 'encrypted_234567.pdf',
            chemin: '/assets/archives/jugement_d_annulation/Mli184413.pdf',
            type_doc: 'Jugement d\'annulation',
            date_creation: new Date('2025-04-21'),
            date_derniere_modification: new Date('2025-04-21'),
            institution_source: 'Tribunal',
            institution_source_id: 4,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Hawa',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 23,
            nom_origine: 'Jugement d\'homologation de Adama',
            nom: 'encrypted_345678.pdf',
            chemin: '/assets/archives/jugement_d_homologation/Mli1844.pdf',
            type_doc: 'Jugement d\'homologation',
            date_creation: new Date('2025-04-21'),
            date_derniere_modification: new Date('2025-04-21'),
            institution_source: 'Tribunal',
            institution_source_id: 5,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Adama',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 24,
            nom_origine: 'Jugement d\'homologation de Rama',
            nom: 'encrypted_456789.pdf',
            chemin: '/assets/archives/jugement_d_homologation/Mli184413.pdf',
            type_doc: 'Jugement d\'homologation',
            date_creation: new Date('2025-04-21'),
            date_derniere_modification: new Date('2025-04-21'),
            institution_source: 'Tribunal',
            institution_source_id: 5,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Rama',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 25,
            nom_origine: 'Jugement déclaratif de Mamadou',
            nom: 'encrypted_567890.pdf',
            chemin: '/assets/archives/jugement_declaratif/Mli1844.pdf',
            type_doc: 'Jugement déclaratif',
            date_creation: new Date('2025-04-20'),
            date_derniere_modification: new Date('2025-04-20'),
            institution_source: 'Tribunal',
            institution_source_id: 6,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Mamadou',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 26,
            nom_origine: 'Jugement déclaratif de Aminata',
            nom: 'encrypted_678901.pdf',
            chemin: '/assets/archives/jugement_declaratif/Mli184413.pdf',
            type_doc: 'Jugement déclaratif',
            date_creation: new Date('2025-04-20'),
            date_derniere_modification: new Date('2025-04-20'),
            institution_source: 'Tribunal',
            institution_source_id: 6,
            utilisateur_createur: 0,
            utilisateur_dernier_modificateur: 0,
            version: 1,
            concerne_1: 'Aminata',
            concerne_2: '',
            supprime: 0,
            size: 175
        },
        {
            id: 27,
            nom_origine: 'Publication de mariage de Abdoulaye & Djénéba',
            nom: 'encrypted_789012.pdf',
            chemin: '/assets/archives/publication_de_mariage/Mli1844.pdf',
            type_doc: 'Publication de mariage',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 7,
            utilisateur_createur: 8,
            utilisateur_dernier_modificateur: 8,
            version: 1,
            concerne_1: 'Abdoulaye',
            concerne_2: 'Djénéba',
            supprime: 0,
            size: 175
        },
        {
            id: 28,
            nom_origine: 'Publication de mariage de Souleymane & Oumou',
            nom: 'encrypted_890123.pdf',
            chemin: '/assets/archives/publication_de_mariage/Mli184413.pdf',
            type_doc: 'Publication de mariage',
            date_creation: new Date('2025-04-24'),
            date_derniere_modification: new Date('2025-04-24'),
            institution_source: 'Centre d\'état civil',
            institution_source_id: 7,
            utilisateur_createur: 8,
            utilisateur_dernier_modificateur: 8,
            version: 1,
            concerne_1: 'Souleymane',
            concerne_2: 'Oumou',
            supprime: 0,
            size: 175
        }
    ];

    constructor() { }

    getRegions(): Observable<any[]> {
        return of(this.regions).pipe(delay(300));
    }

    getCerclesByRegion(regionId: number): Observable<any[]> {
        return of(this.cercles.filter(cercle => cercle.region_id === regionId)).pipe(delay(300));
    }

    getCommunesByCercle(cercleId: number): Observable<any[]> {
        return of(this.communes.filter(commune => commune.cercle_id === cercleId)).pipe(delay(300));
    }

    getCentresEtatCivilByCommune(communeId: number): Observable<any[]> {
        return of(this.centresEtatCivil.filter(centre => centre.commune_id === communeId)).pipe(delay(300));
    }

    getCentresDeclarationByCommune(communeId: number): Observable<any[]> {
        return of(this.centresDeclaration.filter(centre => centre.commune_id === communeId)).pipe(delay(300));
    }

    getTribunauxByCommune(communeId: number): Observable<any[]> {
        return of(this.tribunaux.filter(tribunal => tribunal.commune_id === communeId)).pipe(delay(300));
    }

    getDocuments(filters?: any): Observable<any[]> {
        let filteredDocs = [...this.documents];

        if (filters) {
            // Filtre par type de document
            if (filters.documentType) {
                filteredDocs = filteredDocs.filter(doc => doc.type_doc === filters.documentType);
            }

            // Filtre par institution source
            if (filters.institution) {
                filteredDocs = filteredDocs.filter(doc => doc.institution_source === filters.institution);
            }

            // Filtre par région
            if (filters.region) {
                // Pour simplifier, nous supposerons que le nom de la région est inclus dans le chemin
                filteredDocs = filteredDocs.filter(doc =>
                    doc.chemin.includes(filters.region) ||
                    doc.institution_source.includes(filters.region)
                );
            }

            // Filtre par dates
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                filteredDocs = filteredDocs.filter(doc => doc.date_creation >= startDate);
            }

            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                filteredDocs = filteredDocs.filter(doc => doc.date_creation <= endDate);
            }

            // Filtre par personne concernée
            if (filters.concernedPerson) {
                filteredDocs = filteredDocs.filter(doc =>
                    doc.concerne_1.toLowerCase().includes(filters.concernedPerson.toLowerCase()) ||
                    (doc.concerne_2 && doc.concerne_2.toLowerCase().includes(filters.concernedPerson.toLowerCase()))
                );
            }

            // Filtre par chemin
            if (filters.path) {
                filteredDocs = filteredDocs.filter(doc => doc.chemin.startsWith(filters.path));
            }

            // Exclure les documents supprimés si demandé
            if (filters.excludeDeleted) {
                filteredDocs = filteredDocs.filter(doc => doc.supprime === 0);
            }

            // Recherche textuelle
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                filteredDocs = filteredDocs.filter(doc =>
                    doc.nom_origine.toLowerCase().includes(term) ||
                    doc.type_doc.toLowerCase().includes(term) ||
                    doc.concerne_1.toLowerCase().includes(term) ||
                    (doc.concerne_2 && doc.concerne_2.toLowerCase().includes(term)) ||
                    doc.institution_source.toLowerCase().includes(term)
                );
            }
        }

        return of(filteredDocs).pipe(delay(500));
    }

    getDocumentById(id: number): Observable<any> {
        const document = this.documents.find(doc => doc.id === id);
        return of(document).pipe(delay(300));
    }

    getDocumentsByType(type: string): Observable<any[]> {
        return of(this.documents.filter(doc => doc.type_doc === type)).pipe(delay(300));
    }

    // Ajoutons cette méthode au service DatabaseService

    /**
     * Récupère les documents stockés dans un chemin spécifique
     * @param path Chemin du dossier
     * @returns Liste des documents trouvés
     */
    getDocumentsByPath(path: string): Observable<any[]> {
        // Extraire les parties du chemin
        const pathParts = path.split('/').filter(part => part !== '');

        // Si nous sommes au dernier niveau (dans un dossier d'institution spécifique)
        if ((pathParts.length >= 7 && pathParts[5] === "Centre d'état civil") ||
            (pathParts.length >= 7 && pathParts[5] === "Centre de déclaration") ||
            (pathParts.length >= 7 && pathParts[5] === "Tribunal")) {

            // Déterminer le type d'institution
            let institutionType = '';
            if (pathParts[5] === "Centre d'état civil") {
                institutionType = "Centre d'état civil";
            } else if (pathParts[5] === "Centre de déclaration") {
                institutionType = "Centre de déclaration";
            } else {
                institutionType = "Tribunal";
            }

            // Filtrer les documents selon le type de document et l'institution
            return this.getDocuments({
                documentType: pathParts[1],
                institution: institutionType,
                region: pathParts[2],
                // Ajouter d'autres filtres si nécessaire
            });
        }

        // Pour les chemins temporels (par date)
        if (pathParts.length >= 4 && !isNaN(Number(pathParts[2]))) {
            const year = parseInt(pathParts[2]);
            const filters: any = {
                documentType: pathParts[1]
            };

            // Ajouter les filtres de date
            if (pathParts.length >= 4) {
                const month = parseInt(pathParts[3]);
                if (pathParts.length >= 5) {
                    const day = parseInt(pathParts[4]);
                    // Filtrer par jour spécifique
                    const startDate = new Date(year, month - 1, day);
                    const endDate = new Date(year, month - 1, day, 23, 59, 59);
                    filters.startDate = startDate;
                    filters.endDate = endDate;
                } else {
                    // Filtrer par mois
                    const startDate = new Date(year, month - 1, 1);
                    const endDate = new Date(year, month, 0, 23, 59, 59);
                    filters.startDate = startDate;
                    filters.endDate = endDate;
                }
            } else {
                // Filtrer par année
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31, 23, 59, 59);
                filters.startDate = startDate;
                filters.endDate = endDate;
            }

            return this.getDocuments(filters);
        }

        // Par défaut, retourner un tableau vide
        return of([]);
    }

    getDocumentTypes(): Observable<string[]> {
        const types = [...new Set(this.documents.map(doc => doc.type_doc))];
        return of(types).pipe(delay(300));
    }

    getYearsByDocumentType(type: string): Observable<number[]> {
        const documents = this.documents.filter(doc => doc.type_doc === type);
        const years = [...new Set(documents.map(doc => doc.date_creation.getFullYear()))];
        return of(years.sort((a, b) => b - a)).pipe(delay(300)); // Tri décroissant
    }

    getMonthsByYearAndType(type: string, year: number): Observable<number[]> {
        const documents = this.documents.filter(doc =>
            doc.type_doc === type &&
            doc.date_creation.getFullYear() === year
        );
        const months = [...new Set(documents.map(doc => doc.date_creation.getMonth() + 1))];
        return of(months.sort((a, b) => a - b)).pipe(delay(300)); // Tri croissant
    }

    getDaysByMonthYearAndType(type: string, year: number, month: number): Observable<number[]> {
        const documents = this.documents.filter(doc =>
            doc.type_doc === type &&
            doc.date_creation.getFullYear() === year &&
            doc.date_creation.getMonth() + 1 === month
        );
        const days = [...new Set(documents.map(doc => doc.date_creation.getDate()))];
        return of(days.sort((a, b) => a - b)).pipe(delay(300)); // Tri croissant
    }
}