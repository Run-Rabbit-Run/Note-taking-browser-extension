export const EXPORT_DIRECTORY_NAME_STORAGE_KEY = '__rabbit_note_export_directory_name';

const EXPORT_DIRECTORY_DB_NAME = 'rabbit-note-export-directory';
const EXPORT_DIRECTORY_STORE_NAME = 'directory-handles';
const EXPORT_DIRECTORY_HANDLE_KEY = 'default-export-directory';

type DirectoryPickerOptions = {
    id?: string;
    mode?: 'read' | 'readwrite';
};

type DirectoryPickerWindow = Window & {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
};

type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
    queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

export type ExportDirectoryWriteResult = 'written' | 'not-configured' | 'permission-denied' | 'unsupported' | 'failed';

export const isExportDirectoryPickerSupported = () => {
    return typeof window !== 'undefined'
        && 'indexedDB' in window
        && typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
};

const openExportDirectoryDatabase = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(EXPORT_DIRECTORY_DB_NAME, 1);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(EXPORT_DIRECTORY_STORE_NAME)) {
                database.createObjectStore(EXPORT_DIRECTORY_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const readStoredDirectoryHandle = async () => {
    if (!isExportDirectoryPickerSupported()) return null;

    const database = await openExportDirectoryDatabase();

    return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
        const transaction = database.transaction(EXPORT_DIRECTORY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(EXPORT_DIRECTORY_STORE_NAME);
        const request = store.get(EXPORT_DIRECTORY_HANDLE_KEY);

        request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle | undefined) || null);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    });
};

const saveDirectoryHandle = async (directoryHandle: FileSystemDirectoryHandle) => {
    const database = await openExportDirectoryDatabase();

    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(EXPORT_DIRECTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXPORT_DIRECTORY_STORE_NAME);

        store.put(directoryHandle, EXPORT_DIRECTORY_HANDLE_KEY);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    });
};

const deleteDirectoryHandle = async (): Promise<void> => {
    if (!('indexedDB' in window)) {
        return;
    }

    const database = await openExportDirectoryDatabase();

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(EXPORT_DIRECTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXPORT_DIRECTORY_STORE_NAME);

        store.delete(EXPORT_DIRECTORY_HANDLE_KEY);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    });
};

const requestWritePermission = async (directoryHandle: FileSystemDirectoryHandle) => {
    const permissionHandle = directoryHandle as PermissionCapableDirectoryHandle;
    const descriptor = { mode: 'readwrite' as const };

    if (!permissionHandle.queryPermission || !permissionHandle.requestPermission) {
        return 'granted';
    }

    const currentPermission = await permissionHandle.queryPermission(descriptor);

    if (currentPermission === 'granted') return currentPermission;

    return permissionHandle.requestPermission(descriptor);
};

export const getExportDirectoryName = async () => {
    const data = await chrome.storage.local.get(EXPORT_DIRECTORY_NAME_STORAGE_KEY);
    const directoryName = data[EXPORT_DIRECTORY_NAME_STORAGE_KEY];

    return typeof directoryName === 'string' ? directoryName : '';
};

export const chooseExportDirectory = async () => {
    const showDirectoryPicker = (window as DirectoryPickerWindow).showDirectoryPicker;

    if (!showDirectoryPicker) {
        throw new Error('Directory picker is not supported');
    }

    const directoryHandle = await showDirectoryPicker({
        id: 'rabbit-note-export',
        mode: 'readwrite',
    });
    const permission = await requestWritePermission(directoryHandle);

    if (permission !== 'granted') {
        throw new Error('Write permission was not granted');
    }

    await saveDirectoryHandle(directoryHandle);
    await chrome.storage.local.set({
        [EXPORT_DIRECTORY_NAME_STORAGE_KEY]: directoryHandle.name,
    });

    return directoryHandle.name;
};

export const clearExportDirectory = async () => {
    await deleteDirectoryHandle();
    await chrome.storage.local.remove(EXPORT_DIRECTORY_NAME_STORAGE_KEY);
};

export const writeMarkdownToExportDirectory = async (
    fileName: string,
    content: string,
): Promise<ExportDirectoryWriteResult> => {
    if (!isExportDirectoryPickerSupported()) return 'unsupported';

    const directoryHandle = await readStoredDirectoryHandle();

    if (!directoryHandle) return 'not-configured';

    try {
        const permission = await requestWritePermission(directoryHandle);

        if (permission !== 'granted') return 'permission-denied';

        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writableStream = await fileHandle.createWritable();

        await writableStream.write(content);
        await writableStream.close();

        return 'written';
    } catch {
        return 'failed';
    }
};
