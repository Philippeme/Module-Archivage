import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Permission, PermissionCheckResult, PermissionType, ResourcePermission } from '../models/permission.model';
import { AuthService } from './auth.service';
import { User, UserLevel, UserRole } from '../models/user.model';
import { Document, Folder } from '../models/document.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private apiUrl = 'http://api.example.com/api';
    private mockMode = true; // À synchroniser avec le mode API/mock général

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    /**
     * Vérifie si l'utilisateur actuel a une permission spécifique sur une ressource
     */
    checkPermission(
        permissionType: PermissionType,
        resourceType: 'document' | 'folder',
        resourceId: string
    ): Observable<PermissionCheckResult> {
        if (!this.mockMode) {
            return this.http.post<PermissionCheckResult>(`${this.apiUrl}/permissions/check`, {
                permissionType,
                resourceType,
                resourceId
            }).pipe(
                catchError(error => {
                    console.error('Erreur lors de la vérification des permissions', error);
                    return of({ granted: false, reason: 'Erreur de communication avec le serveur' });
                })
            );
        } else {
            // En mode simulation, on utilise une logique simplifiée
            const currentUser = this.authService.getCurrentUser();

            if (!currentUser) {
                return of({ granted: false, reason: 'Utilisateur non connecté' });
            }

            // Simuler une vérification de permission
            return of(this.simulatePermissionCheck(currentUser, permissionType, resourceType, resourceId))
                .pipe(delay(100)); // Délai minimal pour simuler l'appel réseau
        }
    }

    /**
     * Vérifie si l'utilisateur actuel a plusieurs permissions sur une ressource
     */
    checkPermissions(
        permissionTypes: PermissionType[],
        resourceType: 'document' | 'folder',
        resourceId: string
    ): Observable<{ [key in PermissionType]?: PermissionCheckResult }> {
        if (!this.mockMode) {
            return this.http.post<{ [key in PermissionType]?: PermissionCheckResult }>(
                `${this.apiUrl}/permissions/check-multiple`,
                {
                    permissionTypes,
                    resourceType,
                    resourceId
                }
            ).pipe(
                catchError(error => {
                    console.error('Erreur lors de la vérification des permissions multiples', error);

                    // Créer un objet résultat avec toutes les permissions refusées
                    const result: { [key in PermissionType]?: PermissionCheckResult } = {};
                    permissionTypes.forEach(type => {
                        result[type] = { granted: false, reason: 'Erreur de communication avec le serveur' };
                    });

                    return of(result);
                })
            );
        } else {
            // En mode simulation, vérifier chaque permission individuellement
            const currentUser = this.authService.getCurrentUser();

            if (!currentUser) {
                const result: { [key in PermissionType]?: PermissionCheckResult } = {};
                permissionTypes.forEach(type => {
                    result[type] = { granted: false, reason: 'Utilisateur non connecté' };
                });
                return of(result).pipe(delay(100));
            }

            // Simuler les vérifications de permissions
            const result: { [key in PermissionType]?: PermissionCheckResult } = {};
            permissionTypes.forEach(type => {
                result[type] = this.simulatePermissionCheck(currentUser, type, resourceType, resourceId);
            });

            return of(result).pipe(delay(100));
        }
    }

    /**
     * Obtient toutes les permissions de l'utilisateur actuel sur une ressource
     */
    getResourcePermissions(resourceType: 'document' | 'folder', resourceId: string): Observable<ResourcePermission> {
        if (!this.mockMode) {
            return this.http.get<ResourcePermission>(
                `${this.apiUrl}/permissions/${resourceType}/${resourceId}`
            ).pipe(
                catchError(error => {
                    console.error('Erreur lors de la récupération des permissions', error);
                    return throwError(() => new Error('Échec de la récupération des permissions'));
                })
            );
        } else {
            // En mode simulation, déterminer les permissions
            const currentUser = this.authService.getCurrentUser();

            if (!currentUser) {
                return throwError(() => new Error('Utilisateur non connecté'));
            }

            // Permissions par défaut en fonction du rôle
            let permissions: PermissionType[] = [PermissionType.VIEW];

            if (currentUser.role === UserRole.ADMIN) {
                permissions = Object.values(PermissionType);
            } else if (currentUser.role === UserRole.MANAGER) {
                permissions = [PermissionType.VIEW, PermissionType.DOWNLOAD, PermissionType.SHARE, PermissionType.COMMENT];
            } else if (currentUser.role === UserRole.USER) {
                permissions = [PermissionType.VIEW, PermissionType.DOWNLOAD, PermissionType.COMMENT];
            }

            return of({
                resourceId,
                resourceType,
                permissions
            }).pipe(delay(300));
        }
    }

    /**
     * Simule une vérification de permission pour le mode démonstration
     */
    private simulatePermissionCheck(
        user: User,
        permissionType: PermissionType,
        resourceType: 'document' | 'folder',
        resourceId: string
    ): PermissionCheckResult {
        // Les administrateurs ont toutes les permissions
        if (user.role === UserRole.ADMIN) {
            return { granted: true };
        }

        // Les utilisateurs désactivés n'ont aucune permission
        if (!user.active) {
            return { granted: false, reason: 'Votre compte est désactivé' };
        }

        // Vérifications spécifiques selon le type de permission
        switch (permissionType) {
            case PermissionType.VIEW:
                // Tous les utilisateurs actifs peuvent voir les documents, mais avec des restrictions géographiques
                return this.checkGeographicRestriction(user, resourceId, resourceType);

            case PermissionType.DOWNLOAD:
                // Seuls les rôles ADMIN, MANAGER et USER peuvent télécharger
                if (user.role === UserRole.VIEWER) {
                    return {
                        granted: false,
                        reason: 'Les utilisateurs avec le rôle Lecteur ne peuvent pas télécharger de documents',
                        alternatives: ['Demandez un accès étendu à votre administrateur']
                    };
                }
                return this.checkGeographicRestriction(user, resourceId, resourceType);

            case PermissionType.SHARE:
                // Seuls les rôles ADMIN et MANAGER peuvent partager
                if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole)) {
                    return {
                        granted: false,
                        reason: 'Seuls les administrateurs et managers peuvent partager des documents',
                        alternatives: ['Demandez à un manager de partager ce document pour vous']
                    };
                }
                return this.checkGeographicRestriction(user, resourceId, resourceType);

            case PermissionType.COMMENT:
                // Les rôles ADMIN, MANAGER et USER peuvent commenter
                if (user.role === UserRole.VIEWER) {
                    return {
                        granted: false,
                        reason: 'Les utilisateurs avec le rôle Lecteur ne peuvent pas commenter les documents',
                        alternatives: ['Demandez un accès étendu à votre administrateur']
                    };
                }
                return this.checkGeographicRestriction(user, resourceId, resourceType);

            case PermissionType.MANAGE:
                // Seuls les administrateurs et managers peuvent gérer
                if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole)) {
                    return {
                        granted: false,
                        reason: 'Seuls les administrateurs et managers peuvent gérer les documents',
                        alternatives: ['Contactez votre administrateur système pour cette action']
                    };
                }
                return this.checkGeographicRestriction(user, resourceId, resourceType);

            case PermissionType.ADMIN:
                // Seuls les administrateurs ont les droits d'administration
                return {
                    granted: user.role === UserRole.ADMIN as UserRole,
                    reason: user.role === UserRole.ADMIN as UserRole ? undefined : 'Seuls les administrateurs peuvent effectuer cette action',
                    alternatives: user.role === UserRole.ADMIN as UserRole ? undefined : ['Contactez votre administrateur système']
                };

            default:
                return { granted: false, reason: 'Type de permission non reconnu' };
        }
    }

    /**
     * Vérifie les restrictions géographiques pour un utilisateur et une ressource
     */
    private checkGeographicRestriction(
        user: User,
        resourceId: string,
        resourceType: 'document' | 'folder'
    ): PermissionCheckResult {
        // Niveau national: aucune restriction
        if (user.level === UserLevel.NATIONAL) {
            return { granted: true };
        }

        // Simuler la vérification en fonction du niveau de l'utilisateur
        // En production, cela nécessiterait de récupérer les métadonnées du document ou dossier

        // Exemple simplifié pour la simulation:
        const resourceRegion = this.extractRegionFromResourceId(resourceId);

        if (user.level === UserLevel.REGIONAL) {
            if (!user.regions || !resourceRegion) {
                return { granted: false, reason: 'Impossible de vérifier la région du document' };
            }

            if (!user.regions.includes(resourceRegion)) {
                return {
                    granted: false,
                    reason: `Vous n'avez pas accès aux documents de la région ${resourceRegion}`,
                    alternatives: ['Consultez les documents de vos régions autorisées']
                };
            }

            return { granted: true };
        }

        if (user.level === UserLevel.CENTER) {
            if (!user.centers) {
                return { granted: false, reason: 'Aucun centre assigné à votre compte' };
            }

            const resourceCenter = this.extractCenterFromResourceId(resourceId);

            if (!resourceCenter || !user.centers.includes(resourceCenter)) {
                return {
                    granted: false,
                    reason: 'Vous n\'avez pas accès aux documents de ce centre d\'état civil',
                    alternatives: ['Consultez les documents de votre centre assigné']
                };
            }

            return { granted: true };
        }

        // Par défaut, accorder l'accès (pour éviter de bloquer trop de fonctionnalités en démo)
        return { granted: true };
    }

    /**
     * Extrait la région à partir d'un identifiant de ressource (pour la simulation)
     */
    private extractRegionFromResourceId(resourceId: string): string | null {
        const regions = [
            'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'District de Bamako'
        ];

        // En mode simulation, on examine simplement si l'ID contient le nom d'une région
        for (const region of regions) {
            if (resourceId.includes(region)) {
                return region;
            }
        }

        // Pour simplifier la simulation, on attribue des régions en fonction du premier caractère
        const char = resourceId[0]?.toLowerCase();
        if (char === 'a' || char === 'b') return 'Kayes';
        if (char === 'c' || char === 'd') return 'Koulikoro';
        if (char === 'e' || char === 'f') return 'Sikasso';
        if (char === 'g' || char === 'h') return 'Ségou';
        if (char === 'i' || char === 'j') return 'Mopti';

        return 'District de Bamako'; // Par défaut
    }

    /**
     * Extrait le centre à partir d'un identifiant de ressource (pour la simulation)
     */
    private extractCenterFromResourceId(resourceId: string): string | null {
        // En mode simulation, on examine simplement si l'ID contient le nom d'un centre
        const match = resourceId.match(/Centre d'État Civil [A-Z]/);
        if (match) {
            return match[0];
        }

        // Pour simplifier la simulation, on attribue des centres en fonction du premier caractère
        const char = resourceId[0]?.toLowerCase();
        if (char === 'a' || char === 'b') return 'Centre d\'État Civil A';
        if (char === 'c' || char === 'd') return 'Centre d\'État Civil B';
        if (char === 'e' || char === 'f') return 'Centre d\'État Civil C';

        return 'Centre d\'État Civil A'; // Par défaut
    }
}