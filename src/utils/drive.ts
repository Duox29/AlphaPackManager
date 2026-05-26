/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DriveFileInfo, ModpackDatabase } from "../types";

/**
 * Tìm ID của một file theo tên trong thư mục chỉ định
 */
export async function findFileByName(
  apiKey: string,
  folderId: string,
  fileName: string,
  accessToken?: string
): Promise<string | null> {
  const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  if (accessToken) {
    // Nếu có token admin, dùng token
    url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  } else {
    // Nếu không, bắt buộc dùng api key
    url += `&key=${apiKey}`;
  }

  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Lỗi tìm file ${fileName}: ${response.statusText} (${errorBody})`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Đọc nội dung JSON của một file từ Drive
 */
export async function readFileContent<T>(
  apiKey: string,
  fileId: string,
  accessToken?: string
): Promise<T | null> {
  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  if (!accessToken) {
    url += `&key=${apiKey}`;
  }

  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Lỗi tải nội dung file (${fileId}): ${response.statusText}. Chi tiết: ${errorBody}`);
  }

  try {
    return await response.json() as T;
  } catch (e) {
    console.error("Lỗi parse JSON file từ Drive:", e);
    return null;
  }
}

/**
 * Danh sách toàn bộ các file .zip có sẵn trong folder để Quản trị viên ánh xạ
 */
export async function listFiles(
  apiKey: string,
  folderId: string,
  accessToken?: string
): Promise<DriveFileInfo[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=name&pageSize=1000&fields=files(id,name,mimeType,size,createdTime)`;
  
  if (!accessToken) {
    url += `&key=${apiKey}`;
  }

  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Lỗi tải danh sách tệp tin: ${response.statusText}. Chi tiết: ${errorBody}`);
  }

  const data = await response.json();
  return (data.files || []) as DriveFileInfo[];
}

/**
 * Thực hiện lưu nội dung tệp index.json (và tự động index_backup.json) trên Google Drive
 */
export async function uploadFileToFolder(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string,
  existingFileId?: string | null
): Promise<string> {
  const boundary = "foo_bar_baz";
  const metadata = {
    name: fileName,
    mimeType: "application/json",
    ...(existingFileId ? {} : { parents: [folderId] }),
  };

  const multipartBody = 
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    content +
    `\r\n--${boundary}--`;

  const headers: HeadersInit = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": `multipart/related; boundary=${boundary}`,
  };

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
    method = "PATCH";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: multipartBody,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Lỗi cập nhật tệp ${fileName} (${method}): ${response.statusText}. Chi tiết: ${errorBody}`);
  }

  const data = await response.json();
  return data.id as string;
}

/**
 * Thao tác đồng bộ ghi cả index.json lần backup
 */
export async function saveDatabaseWithBackup(
  accessToken: string,
  folderId: string,
  database: ModpackDatabase,
  indexFileId: string | null,
  backupFileId: string | null
): Promise<{ indexFileId: string; backupFileId: string }> {
  const dbString = JSON.stringify(database, null, 2);

  // 1. Lưu file chính index.json
  const newIndexId = await uploadFileToFolder(
    accessToken,
    folderId,
    "index.json",
    dbString,
    indexFileId
  );

  // Tăng mốc thời gian backup
  const backupDatabase: ModpackDatabase = {
    ...database,
    backupCreated: new Date().toISOString(),
  };
  const backupString = JSON.stringify(backupDatabase, null, 2);

  // 2. Lưu file backup index_backup.json
  // Chỉ PATCH khi đã có backupFileId, tránh tạo mới (POST) gây lỗi quota với Service Account.
  const newBackupId = backupFileId
    ? await uploadFileToFolder(
        accessToken,
        folderId,
        "index_backup.json",
        backupString,
        backupFileId
      )
    : backupFileId;

  return {
    indexFileId: newIndexId,
    backupFileId: newBackupId ?? "",
  };
}

/**
 * Tạo link tải trực tiếp cho file zip từ Google Drive dựa vào API key, File ID, hoặc Access Token
 */
export function getDirectDownloadLink(fileId: string, apiKey?: string, accessToken?: string): string {
  if (accessToken) {
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
  }
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
}

/**
 * Trích xuất Google Drive Folder ID từ URL hoặc trả về giá trị thô nếu đã là ID
 */
export function extractFolderIdFromUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch) return idMatch[1];
  return url.trim();
}

// Các hàm bổ thụ mã hóa để tạo JWT Assertion sử dụng Web Crypto API thuần client
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function stringToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Trao đổi tệp khóa Service Account lấy Access Token bằng JWT Bearer Assertion
 */
export async function getAccessTokenFromServiceAccount(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 Giờ hoạt lực

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now
  };

  const headerB64 = stringToBase64Url(JSON.stringify(header));
  const claimB64 = stringToBase64Url(JSON.stringify(claimSet));
  const unsignedToken = `${headerB64}.${claimB64}`;

  const binaryKey = pemToBinary(privateKeyPem);
  const cryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  const assertion = `${unsignedToken}.${signatureB64}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Service Account auth failed: ${response.statusText} (${errText})`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}
