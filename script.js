const THEME_STORAGE_KEY = 'notepad_theme';

class SimpleNotepad {
    constructor() {
        this.notepad = document.getElementById('notepad');
        this.charCount = document.getElementById('charCount');
        this.saveStatus = document.getElementById('saveStatus');
        this.themeToggle = document.getElementById('themeToggle');

        this.initTheme();
        this.initEventListeners();
        this.loadFromStorage();
        this.updateCharCount();
        this.updateSaveStatus('保存済み', 'saved');
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
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const defaultTheme = document.body.getAttribute('data-theme') || 'light';
        const theme = savedTheme || defaultTheme;

        document.body.setAttribute('data-theme', theme);
        this.updateThemeToggleLabel(theme);
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.body.setAttribute('data-theme', nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        this.updateThemeToggleLabel(nextTheme);
    }

    updateThemeToggleLabel(theme) {
        if (!this.themeToggle) return;

        const isDark = theme === 'dark';
        this.themeToggle.textContent = isDark ? 'ライトテーマ' : 'ダークテーマ';
        this.themeToggle.setAttribute('aria-pressed', String(isDark));
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
        localStorage.setItem('notepad_content', content);
        localStorage.setItem('notepad_timestamp', timestamp);
        
        this.updateSaveStatus(`保存済み (${timestamp})`, 'saved');
        
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
        const savedContent = localStorage.getItem('notepad_content');
        if (savedContent) {
            this.notepad.value = savedContent;
        }
    }

    autoSave() {
        const content = this.notepad.value;
        localStorage.setItem('notepad_content', content);
        localStorage.setItem('notepad_timestamp', new Date().toLocaleString('ja-JP'));
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