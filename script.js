const THEME_STORAGE_KEY = 'notepad_theme';
const NOTEPAD_CONTENT_KEY = 'notepad_content';
const NOTEPAD_TIMESTAMP_KEY = 'notepad_timestamp';

function isStorageAccessError(error) {
    return typeof DOMException !== 'undefined' && error instanceof DOMException;
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return { success: true };
    } catch (error) {
        if (isStorageAccessError(error)) {
            return { success: false, error };
        }
        return { success: false, error };
    }
}

function safeGetItem(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return { success: true, value: value !== null ? value : fallback };
    } catch (error) {
        if (isStorageAccessError(error)) {
            return { success: false, value: fallback, error };
        }
        return { success: false, value: fallback, error };
    }
}

function logStorageFailure(message, result) {
    if (!result.success) {
        console.warn(message, result.error);
    }
}

function writeStoredTheme(theme) {
    const result = safeSetItem(THEME_STORAGE_KEY, theme);
    logStorageFailure('テーマ設定を保存できません: ストレージにアクセスできません。', result);
    return result.success;
}

function readStoredTheme(defaultTheme) {
    const result = safeGetItem(THEME_STORAGE_KEY, defaultTheme);
    logStorageFailure('テーマ設定を読み込めません: ストレージにアクセスできません。', result);
    return result.value;
}

class SimpleNotepad {
    constructor() {
        this.notepad = document.getElementById('notepad');
        this.charCount = document.getElementById('charCount');
        this.saveStatus = document.getElementById('saveStatus');
        this.themeToggle = document.getElementById('themeToggle');
        this.storageWarningIssued = false;

        this.initTheme();
        this.initEventListeners();
        this.loadFromStorage();
        this.updateCharCount();
    }

    initEventListeners() {
        // ボタンイベント
        document.getElementById('newBtn').addEventListener('click', () => this.newNote());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveNote());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadNote());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearNote());
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // テキストエリアイベント
        this.notepad.addEventListener('input', () => {
            this.updateCharCount();
            this.updateSaveStatus('未保存', 'unsaved');
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveNote();
            }
        });
        
        // 自動保存（5秒間隔）
        setInterval(() => {
            if (this.notepad.value.trim() !== '') {
                this.autoSave();
            }
        }, 5000);
    }

    initTheme() {
        const defaultTheme = document.body.getAttribute('data-theme') || 'light';
        const theme = readStoredTheme(defaultTheme);

        document.body.setAttribute('data-theme', theme);
        this.updateThemeToggleLabel(theme);
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.body.setAttribute('data-theme', nextTheme);
        writeStoredTheme(nextTheme);
        this.updateThemeToggleLabel(nextTheme);
    }

    updateThemeToggleLabel(theme) {
        if (!this.themeToggle) return;

        const isDark = theme === 'dark';
        this.themeToggle.textContent = isDark ? 'ライトテーマ' : 'ダークテーマ';
        this.themeToggle.setAttribute('aria-pressed', String(isDark));
    }

    notifyStorageIssue(message, { force = false } = {}) {
        if (!this.storageWarningIssued || force) {
            this.updateSaveStatus(message, 'unsaved');
        }
        this.storageWarningIssued = true;
    }

    clearStorageNotice() {
        this.storageWarningIssued = false;
    }

    newNote() {
        if (this.notepad.value.trim() !== '') {
            if (confirm('現在のメモを破棄して新規作成しますか？')) {
                this.notepad.value = '';
                this.updateCharCount();
                this.updateSaveStatus('新規メモ', 'unsaved');
                this.notepad.focus();
            }
        } else {
            this.notepad.focus();
        }
    }

    saveNote() {
        const content = this.notepad.value;
        const timestamp = new Date().toLocaleString('ja-JP');

        // ローカルストレージに保存
        const contentResult = safeSetItem(NOTEPAD_CONTENT_KEY, content);
        const timestampResult = safeSetItem(NOTEPAD_TIMESTAMP_KEY, timestamp);
        logStorageFailure('メモの内容を保存できません: ストレージにアクセスできません。', contentResult);
        logStorageFailure('保存日時を保存できません: ストレージにアクセスできません。', timestampResult);

        if (contentResult.success && timestampResult.success) {
            this.clearStorageNotice();
            this.updateSaveStatus(`保存済み (${timestamp})`, 'saved');
        } else {
            this.notifyStorageIssue('ブラウザの設定でローカル保存がブロックされているため、ブラウザには保存できません。ファイルはダウンロードされました。', { force: true });
        }

        // ファイルとしてダウンロード
        this.downloadAsFile(content);
    }

    loadNote() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.notepad.value = e.target.result;
                    this.updateCharCount();
                    this.updateSaveStatus('ファイル読み込み完了', 'saved');
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    clearNote() {
        if (confirm('メモをクリアしますか？')) {
            this.notepad.value = '';
            this.updateCharCount();
            this.updateSaveStatus('クリア済み', 'saved');
            this.notepad.focus();
        }
    }

    downloadAsFile(content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.href = url;
        a.download = `memo_${timestamp}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    loadFromStorage() {
        const contentResult = safeGetItem(NOTEPAD_CONTENT_KEY, '');
        if (!contentResult.success) {
            logStorageFailure('メモの内容を読み込めません: ストレージにアクセスできません。', contentResult);
            this.notifyStorageIssue('ローカル保存されたメモを読み込めません。ブラウザの設定をご確認ください。', { force: true });
            return;
        }

        if (contentResult.value) {
            this.notepad.value = contentResult.value;
            const timestampResult = safeGetItem(NOTEPAD_TIMESTAMP_KEY, '');
            logStorageFailure('保存日時を読み込めません: ストレージにアクセスできません。', timestampResult);
            if (timestampResult.success && timestampResult.value) {
                this.clearStorageNotice();
                this.updateSaveStatus(`保存済み (${timestampResult.value})`, 'saved');
                return;
            }
        }

        this.clearStorageNotice();
        this.updateSaveStatus('保存済み', 'saved');
    }

    autoSave() {
        const content = this.notepad.value;
        const timestamp = new Date().toLocaleString('ja-JP');
        const contentResult = safeSetItem(NOTEPAD_CONTENT_KEY, content);
        const timestampResult = safeSetItem(NOTEPAD_TIMESTAMP_KEY, timestamp);
        logStorageFailure('自動保存でメモの内容を保存できませんでした。', contentResult);
        logStorageFailure('自動保存で保存日時を保存できませんでした。', timestampResult);

        if (!contentResult.success || !timestampResult.success) {
            this.notifyStorageIssue('自動保存に失敗しました（ブラウザの設定でローカル保存がブロックされています）');
            return;
        }

        this.clearStorageNotice();
    }

    updateCharCount() {
        const count = this.notepad.value.length;
        this.charCount.textContent = `${count}文字`;
    }

    updateSaveStatus(message, className) {
        this.saveStatus.textContent = message;
        this.saveStatus.className = className;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new SimpleNotepad();
});