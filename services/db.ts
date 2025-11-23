
import { db, storage } from './firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, getDocs, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { AppState, User, CourseFolder, AdminConfig, UserProgress, Comment, UserRole, LoginRequest } from '../types';
import { INITIAL_CONFIG, DEFAULT_ADMIN, INITIAL_FOLDERS } from '../constants';

// Collection References
const USERS_COL = 'users';
const FOLDERS_COL = 'folders';
const COMMENTS_COL = 'comments';
const PROGRESS_COL = 'userProgress';
const SETTINGS_COL = 'settings';
const REQUESTS_COL = 'loginRequests';
const CONFIG_DOC_ID = 'main_config';

// --- Initialization ---

export const initializeDatabase = async () => {
    // Check if config exists, if not, seed database
    const configRef = doc(db, SETTINGS_COL, CONFIG_DOC_ID);
    const configSnap = await getDocs(query(collection(db, SETTINGS_COL)));

    if (configSnap.empty) {
        console.log("Seeding Database...");
        
        // Seed Config
        await setDoc(configRef, INITIAL_CONFIG);

        // Seed Admin
        await setDoc(doc(db, USERS_COL, DEFAULT_ADMIN.id), DEFAULT_ADMIN);

        // Seed Initial Folder
        for (const folder of INITIAL_FOLDERS) {
            await setDoc(doc(db, FOLDERS_COL, folder.id), folder);
        }
    }
};

// --- Subscriptions ---

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    return onSnapshot(collection(db, USERS_COL), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        callback(users);
    });
};

export const subscribeToFolders = (callback: (folders: CourseFolder[]) => void) => {
    return onSnapshot(collection(db, FOLDERS_COL), (snapshot) => {
        const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseFolder));
        callback(folders);
    });
};

export const subscribeToComments = (callback: (comments: Comment[]) => void) => {
    return onSnapshot(collection(db, COMMENTS_COL), (snapshot) => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        callback(comments);
    });
};

export const subscribeToProgress = (callback: (progress: UserProgress[]) => void) => {
    return onSnapshot(collection(db, PROGRESS_COL), (snapshot) => {
        const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProgress));
        callback(progress);
    });
};

export const subscribeToConfig = (callback: (config: AdminConfig) => void) => {
    return onSnapshot(doc(db, SETTINGS_COL, CONFIG_DOC_ID), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as AdminConfig);
        }
    });
};

// Listen to a specific login request (For the Login Screen waiting)
export const subscribeToLoginRequest = (requestId: string, callback: (req: LoginRequest | null) => void) => {
    return onSnapshot(doc(db, REQUESTS_COL, requestId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as LoginRequest);
        } else {
            callback(null);
        }
    });
};

// Listen to ALL pending requests (For Admin)
export const subscribeToAllLoginRequests = (callback: (reqs: LoginRequest[]) => void) => {
    const q = query(collection(db, REQUESTS_COL), where("status", "==", "PENDING"));
    return onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginRequest));
        callback(reqs);
    });
};

// Listen to pending requests for a specific user (For User Dashboard)
export const subscribeToUserLoginRequests = (userId: string, callback: (reqs: LoginRequest[]) => void) => {
    const q = query(collection(db, REQUESTS_COL), where("userId", "==", userId), where("status", "==", "PENDING"));
    return onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginRequest));
        callback(reqs);
    });
};

// --- CRUD Operations ---

export const addUser = async (user: User) => {
    await setDoc(doc(db, USERS_COL, user.id), user);
};

export const updateUser = async (user: User) => {
    await updateDoc(doc(db, USERS_COL, user.id), { ...user });
};

export const deleteUser = async (userId: string) => {
    await deleteDoc(doc(db, USERS_COL, userId));
};

export const addFolder = async (folder: CourseFolder) => {
    await setDoc(doc(db, FOLDERS_COL, folder.id), folder);
};

export const updateFolder = async (folder: CourseFolder) => {
    await updateDoc(doc(db, FOLDERS_COL, folder.id), { ...folder });
};

export const deleteFolder = async (folderId: string) => {
    await deleteDoc(doc(db, FOLDERS_COL, folderId));
};

export const updateConfig = async (config: AdminConfig) => {
    await setDoc(doc(db, SETTINGS_COL, CONFIG_DOC_ID), config);
};

export const addComment = async (comment: Comment) => {
    await setDoc(doc(db, COMMENTS_COL, comment.id), comment);
};

export const updateComment = async (comment: Comment) => {
    await updateDoc(doc(db, COMMENTS_COL, comment.id), { ...comment });
};

export const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, COMMENTS_COL, commentId));
};

export const updateUserProgress = async (progress: UserProgress) => {
    await setDoc(doc(db, PROGRESS_COL, progress.userId), progress);
};

// --- Storage Operations ---

export const uploadResourceFile = (
    file: File, 
    folderId: string,
    onProgress?: (progress: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            // Create a unique path: course_files/{folderId}/{timestamp}_{filename}
            const storageRef = ref(storage, `course_files/${folderId}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error("Upload error:", error);
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        } catch (error) {
            console.error("Error starting upload:", error);
            reject(error);
        }
    });
};

// --- Login Request Logic ---

export const createLoginRequest = async (request: LoginRequest) => {
    await setDoc(doc(db, REQUESTS_COL, request.id), request);
};

export const approveLoginRequest = async (request: LoginRequest) => {
    // 1. Mark request as APPROVED
    await updateDoc(doc(db, REQUESTS_COL, request.id), { status: 'APPROVED' });
    
    // 2. Update User with new session Token (This logs out the old user)
    await updateDoc(doc(db, USERS_COL, request.userId), { sessionToken: request.newSessionToken });
};

export const rejectLoginRequest = async (requestId: string) => {
    await updateDoc(doc(db, REQUESTS_COL, requestId), { status: 'REJECTED' });
};

// --- Backup & Restore (JSON) ---

export const backupDatabase = async (): Promise<string> => {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    const foldersSnap = await getDocs(collection(db, FOLDERS_COL));
    const commentsSnap = await getDocs(collection(db, COMMENTS_COL));
    const progressSnap = await getDocs(collection(db, PROGRESS_COL));
    const configSnap = await getDocs(collection(db, SETTINGS_COL));

    const state = {
        users: usersSnap.docs.map(d => d.data()),
        folders: foldersSnap.docs.map(d => d.data()),
        comments: commentsSnap.docs.map(d => d.data()),
        userProgress: progressSnap.docs.map(d => d.data()),
        config: configSnap.docs.find(d => d.id === CONFIG_DOC_ID)?.data() || INITIAL_CONFIG
    };

    return JSON.stringify(state, null, 2);
};

export const restoreDatabase = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        
        // Basic Validation
        if(!data.users || !data.folders) throw new Error("Invalid format");

        // Restore Config
        await setDoc(doc(db, SETTINGS_COL, CONFIG_DOC_ID), data.config);

        // Restore Users
        for(const u of data.users) await setDoc(doc(db, USERS_COL, u.id), u);
        
        // Restore Folders
        for(const f of data.folders) await setDoc(doc(db, FOLDERS_COL, f.id), f);

        // Restore Comments
        for(const c of data.comments) await setDoc(doc(db, COMMENTS_COL, c.id), c);

        // Restore Progress
        for(const p of data.userProgress) await setDoc(doc(db, PROGRESS_COL, p.userId), p);

        return true;
    } catch (e) {
        console.error("Restore failed", e);
        return false;
    }
};

export const factoryReset = async () => {
     const folders = await getDocs(collection(db, FOLDERS_COL));
     for(const d of folders.docs) await deleteDoc(d.ref);

     const users = await getDocs(collection(db, USERS_COL));
     for(const d of users.docs) await deleteDoc(d.ref);

     await setDoc(doc(db, USERS_COL, DEFAULT_ADMIN.id), DEFAULT_ADMIN);
     await setDoc(doc(db, SETTINGS_COL, CONFIG_DOC_ID), INITIAL_CONFIG);
     
     window.location.reload();
};
