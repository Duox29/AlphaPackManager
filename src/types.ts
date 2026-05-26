/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppConfig {
  apiKey?: string;
  folderId: string;
  folderUrl?: string;
  serviceAccountKey?: {
    type?: string;
    project_id?: string;
    private_key_id?: string;
    private_key?: string;
    client_email?: string;
    client_id?: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
    client_x509_cert_url?: string;
    universe_domain?: string;
  };
  password?: string;
}

export interface ModpackVersion {
  id: string; // e.g. "1.0.0", "1.1.0-beta"
  fileId: string; // Google Drive file ID for the .zip pack
  fileName: string; // Original name of the .zip file
  uploadedAt: string; // ISO date string
  size: number; // File size in bytes
  changelog: string; // What changed in this version
  gameVersion: string; // e.g., "1.20.1", "1.12.2"
  isActive: boolean; // Is it available to download
}

export interface Modpack {
  id: string; // Machine-friendly unique id
  name: string; // Human name
  description: string; // Detailed description of the modpack
  category: string; // e.g., "RPG", "Skyblock", "Vanilla+", etc.
  imageUrl?: string; // Optional cover image source (or fallback thumbnail)
  versions: ModpackVersion[]; // Array of releases
  createdAt: string;
  updatedAt: string;
}

export interface ModpackDatabase {
  lastUpdated: string;
  backupCreated?: string;
  modpacks: Modpack[];
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
}
