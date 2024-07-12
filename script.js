function setTheme() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
        document.body.classList.add('day-theme');
        document.body.classList.remove('night-theme');
    } else {
        document.body.classList.add('night-theme');
        document.body.classList.remove('day-theme');
    }
}

document.getElementById('clearStorageButton').addEventListener('click', () => {
    localStorage.clear();
    alert('已尝试清除数据。由于浏览器特性，建议通过专门的清理工具再次清理。');
    location.reload();
});

let currentEncoding = targetEncoding = true;
let stopDOM = ["BR", "TIME", "IMG", "CANVAS", "SCRIPT"];

if (localStorage.getItem("targetEncoding") === "false") {
    targetEncoding = false;
    translateBody();
}

function translateBody(obj) {
    let objs = (obj ? obj : document.body).childNodes;
    for (let i = 0; i < objs.length; i++) {
        if (objs[i].nodeType === 3 && /[\u4e00-\u9fa5]/g.test(objs[i].textContent)) {
            objs[i].textContent = Exchange(objs[i].textContent);
        } else if (objs[i].nodeType === 1 && !stopDOM.includes(objs[i].tagName)) {
            translateBody(objs[i]);
        }
    }
}

function loadTranslations() {
    let translations = {
        simplifiedWords: [],
        traditionalWords: [],
        simplifiedChars: [],
        traditionalChars: []
    };

    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'list.txt', false);
    xhr.onload = function() {
        if (xhr.status === 200) {
            let lines = xhr.responseText.split('\n');
            if (lines.length >= 4) {
                translations.simplifiedWords = lines[0].split(',');
                translations.traditionalWords = lines[1].split(',');
                translations.simplifiedChars = lines[2].split(',');
                translations.traditionalChars = lines[3].split(',');
            }
        }
    };
    xhr.send();
    return translations;
}

let translations = loadTranslations();

function Exchange(text) {
    let result = text;
    let sWords = translations.simplifiedWords;
    let tWords = translations.traditionalWords;
    let sChars = translations.simplifiedChars;
    let tChars = translations.traditionalChars;

    if (!currentEncoding) {
        [sWords, tWords] = [tWords, sWords];
        [sChars, tChars] = [tChars, sChars];
    }

    for (let i = 0; i < sWords.length; i++) {
        let regex = new RegExp(sWords[i], 'g');
        result = result.replace(regex, tWords[i]);
    }

    for (let i = 0; i < sChars.length; i++) {
        let regex = new RegExp(sChars[i], 'g');
        result = result.replace(regex, tChars[i]);
    }

    return result;
}

function translatePage() {
    currentEncoding = targetEncoding;
    targetEncoding = !targetEncoding;
    localStorage.setItem("targetEncoding", targetEncoding);
    translateBody();
}



let isEditing = false;
let isAutoScrolling = false;
let contentChanged = false;
let isAscendingOrder = true;
let autoScrollInterval;
let chapterPositions = [];
let matches = [];
let fileName = 'default.txt';

const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: "text",
    lineNumbers: false,
    theme: "material",
    lineWrapping: true,
    readOnly: 'nocursor'
});


function initializeEditorSettings() {
    const fontSize = document.getElementById('fontSize').value;
    const pageMargin = document.getElementById('pageMargin').value;
    const lineHeight = document.getElementById('lineHeight').value;
    const fontColor = document.getElementById('fontColor').value;
    const bgColor = document.getElementById('bgColor').value;

    editor.getWrapperElement().style.fontSize = `${fontSize}px`;
    editor.getWrapperElement().style.padding = `${pageMargin}px`;
    editor.getWrapperElement().style.lineHeight = `${lineHeight}`;
    editor.getWrapperElement().style.color = fontColor;
    editor.getWrapperElement().style.backgroundColor = bgColor;
}

function closeAllPopups() {
    document.querySelectorAll('.popup').forEach(popup => {
        popup.classList.remove('visible');
    });
}

function toggleHeaderFooter() {
    if (isEditing) {
        return;
    }
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    const edit = document.querySelector('.edit');

    header.classList.toggle('hidden');
    footer.classList.toggle('hidden2');


}

function toggleEditMode() {
    isEditing = !isEditing;
    editor.setOption("readOnly", isEditing ? false : 'nocursor'); // 切换 readOnly 模式
    document.getElementById('viewModeButtons').style.display = isEditing ? 'none' : 'block';
    document.getElementById('editModeButtons').style.display = isEditing ? 'block' : 'none';

    if (!isEditing) {
        closePopup('popupReplace');
        clearHighlights();
    } else {
        highlightMatches();
    }
}



function uploadFile() {
    document.getElementById('fileInput').click();
}

function showToast() {
    var toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(function() {
        toast.className = toast.className.replace("show", "");
    }, 3500);
}

//查找
function getSearchParams() {
    return {
        searchTerm: document.getElementById('searchTerm').value,
        caseSensitive: document.getElementById('caseSensitive').checked,
        wholeWord: document.getElementById('wholeWord').checked,
        regex: document.getElementById('regex').checked
    };
}

function performSearch() {
    const {
        searchTerm,
        caseSensitive,
        wholeWord,
        regex
    } = getSearchParams();
    if (!searchTerm) {
        matches = [];
        highlightMatches();
        return;
    }

    let query = searchTerm;
    if (!regex) {
        query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
        query = `\\b${query}\\b`;
    }

    let searchCursor = editor.getSearchCursor(new RegExp(query, caseSensitive ? 'g' : 'gi'));
    matches = [];

    while (searchCursor.findNext()) {
        matches.push({
            from: searchCursor.from(),
            to: searchCursor.to()
        });
    }
    matches.reverse();

    highlightMatches();
}

function highlightMatches() {
    editor.operation(() => {
        editor.getAllMarks().forEach(mark => mark.clear());
        matches.forEach((match, index) => {
            editor.markText(match.from, match.to, {
                className: 'highlight',
                css: index === 0 ? 'background-color: #FF892E;' : 'background-color: #8BB0FF;'
            });
        });
    });
}

function clearHighlights() {
    editor.operation(() => {
        editor.getAllMarks().forEach(mark => mark.clear());
    });
}

function selectNextMatch() {
    if (matches.length > 0) {
        const match = matches.pop();
        matches.unshift(match);
        highlightMatches();

        editor.setSelection(match.from, match.to);
    }
}

document.getElementById('searchTerm').addEventListener('input', performSearch);

function replace() {
    const {
        searchTerm,
        caseSensitive,
        wholeWord,
        regex
    } = getSearchParams();
    const replaceTerm = document.getElementById('replaceTerm').value;

    if (!searchTerm) return;

    let query = searchTerm;
    if (!regex) {
        query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
        query = `\\b${query}\\b`;
    }

    let searchCursor = editor.getSearchCursor(new RegExp(query, caseSensitive ? 'g' : 'gi'));

    if (searchCursor.findNext()) {
        editor.replaceRange(replaceTerm, searchCursor.from(), searchCursor.to());
        performSearch();
    }
}

function replaceAll() {
    const {
        searchTerm,
        caseSensitive,
        wholeWord,
        regex
    } = getSearchParams();
    const replaceTerm = document.getElementById('replaceTerm').value;

    if (!searchTerm) return;

    let query = searchTerm;
    if (!regex) {
        query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
        query = `\\b${query}\\b`;
    }

    let searchCursor = editor.getSearchCursor(new RegExp(query, caseSensitive ? 'g' : 'gi'));

    editor.operation(() => {
        while (searchCursor.findNext()) {
            editor.replaceRange(replaceTerm, searchCursor.from(), searchCursor.to());
        }
    });

    performSearch();
}

function generateCatalog() {
    const catalogContent = document.getElementById('catalogContent');
    catalogContent.innerHTML = '<b>正在获取标题，请耐心等待...</b>';

    setTimeout(() => {
        const content = editor.getValue();
        const lines = content.split(/\r?\n/); // 逐行处理

        // 干扰词
        const interferenceWords = ['部分', '一页', '两页', '回合', '回家', '回来', '回去', '回头', '回到', '二话不说'];
        const interferenceRegex = new RegExp(interferenceWords.join('|'), 'g');

        // 四种分章规则，依次使用
        const regexChinese = /(?:^|\n)\s*((第?[0123456789一二三四五六七八九十零〇百千两]+|[0123456789一二三四五六七八九十零〇百千两]+)[章回话篇卷页节部集])\s*[^\r\n]*(?=\n|$)/gm;
        const regexEnglish = /(?:^|\n)\s*(Chapter|Section|Part|Volume)\s+[0-9]+\s*[^\r\n]*(?=\n|$)/gim;
        const regexDocument = /^(?:[0-9]|[①-⑩]|[ⅰ-ⅹ])\..*/gm;
        const regexNewType = /(?:^|\n)\s*[0-9]+\s*、\s*[^\r\n]*(?=\n|$)/gm;

        let chaptersChinese = [];
        let chaptersEnglish = [];
        let chaptersDocument = [];
        let chaptersNewType = [];

        // 逐行处理
        lines.forEach((line, index) => {
            const filteredLine = line.replace(interferenceRegex, '');
            if (regexChinese.test(filteredLine)) {
                chaptersChinese.push({
                    title: filteredLine,
                    position: index
                });
            } else if (regexEnglish.test(filteredLine) && chaptersChinese.length === 0) {
                chaptersEnglish.push({
                    title: filteredLine,
                    position: index
                });
            } else if (regexDocument.test(filteredLine) && chaptersChinese.length === 0 && chaptersEnglish.length === 0) {
                chaptersDocument.push({
                    title: filteredLine,
                    position: index
                });
            } else if (regexNewType.test(filteredLine) && chaptersChinese.length === 0 && chaptersEnglish.length === 0 && chaptersDocument.length === 0) {
                chaptersNewType.push({
                    title: filteredLine,
                    position: index
                });
            }
        });

        const chapters = chaptersChinese.length ? chaptersChinese : chaptersEnglish.length ? chaptersEnglish : chaptersDocument.length ? chaptersDocument : chaptersNewType;

        if (chapters.length === 0) {
            catalogContent.innerHTML = '<p>无法分割章节</p>';
            return;
        }

        catalogContent.innerHTML = '';

        chapterPositions = chapters.map(chapter => ({
            title: chapter.title,
            position: chapter.position
        }));

        let currentIndex = 0;
        const batchSize = 10; // 每批次处理的章节数
        const delay = 1; // 每批次间隔的毫秒数

        function processBatch() {
            for (let i = 0; i < batchSize && currentIndex < chapterPositions.length; i++, currentIndex++) {
                const {
                    title,
                    position
                } = chapterPositions[currentIndex];

                const button = document.createElement('button');
                button.className = 'chapter-button';
                button.innerText = title.replace(/\r?\n/g, '');
                button.onclick = () => scrollToPosition(position);
                catalogContent.appendChild(button);
            }

            if (currentIndex < chapterPositions.length) {
                catalogContent.innerHTML = `<b>正在获取第 ${currentIndex + 1} 个标题内容，共 ${chapterPositions.length} 个标题...</b>`;
                setTimeout(processBatch, delay);
            } else {
                catalogContent.innerHTML = '';
                displayCatalog();
            }
        }

        processBatch();
    }, 10);
}

function displayCatalog() {
    const catalogContent = document.getElementById('catalogContent');
    catalogContent.innerHTML = ''; // 清空目录内容

    const sortedChapters = isAscendingOrder ? chapterPositions : [...chapterPositions].reverse();

    sortedChapters.forEach(({
        title,
        position
    }) => {
        const button = document.createElement('button');
        button.className = 'chapter-button';
        button.innerText = title.replace(/\r?\n/g, '');
        button.onclick = () => scrollToPosition(position);
        catalogContent.appendChild(button);
    });
}

function scrollToPosition(lineNumber) {
    const content = editor.getValue();
    const lines = content.split(/\r?\n/);
    let charCount = 0;
    for (let i = 0; i < lineNumber; i++) {
        charCount += lines[i].length + 1;
    }

    editor.scrollIntoView({
        line: lineNumber,
        ch: 0
    });
    editor.setCursor({
        line: lineNumber,
        ch: 0
    });
    closePopup('popupCatalog');
}

function toggleOrder() {
    isAscendingOrder = !isAscendingOrder;
    displayCatalog();
}

function showPopup(id) {
    closeAllPopups();
    const popup = document.getElementById(id);
    popup.classList.remove('hiding');
    popup.classList.add('visible');
}

function closePopup(id) {
    const popup = document.getElementById(id);
    popup.classList.add('hiding');
    popup.addEventListener('animationend', function handler() {
        popup.classList.remove('visible');
        popup.classList.remove('hiding');
        popup.removeEventListener('animationend', handler);
    });
}

function closeAllPopups() {
    const popups = document.querySelectorAll('.popup.visible');
    popups.forEach(popup => {
        popup.classList.add('hiding');
        popup.addEventListener('animationend', function handler() {
            popup.classList.remove('visible');
            popup.classList.remove('hiding');
            popup.removeEventListener('animationend', handler);
        });
    });
}

function showAbout() {
    showPopup('popupAbout');
}

function selectReplace() {
    showPopup('popupReplace');
}

function showCatalog() {
    showPopup('popupCatalog');
}

function showLayout() {
    showPopup('popupLayout');
}

function showSettings() {
    showPopup('popupSettings');
}
//布局
const defaultSettings = {
    fontSize: 22,
    pageMargin: 10,
    lineHeight: 1.6,
    letterSpacing: 2.2,
    fontColor: "#333",
    bgColor: "#e2e4e8",
    fontFamily: "Arial"
};

const nightThemeSettings = {
    fontColor: "#d2d4d2",
    bgColor: "#000d00"
};

function applyLayoutSettings() {
    const settings = {
        fontSize: document.getElementById('fontSize').value,
        pageMargin: document.getElementById('pageMargin').value,
        lineHeight: document.getElementById('lineHeight').value,
        fontColor: document.getElementById('fontColor').value,
        bgColor: document.getElementById('bgColor').value,
        fontFamily: document.getElementById('fontFamily').value,
        letterSpacing: document.getElementById('letterSpacing').value
    };

    updateEditorSettings(settings);
    saveSettingsToLocalStorage(settings);
    closePopup('popupLayout');
}

function updateEditorSettings(settings) {
    const wrapper = editor.getWrapperElement();
    const autoTheme = localStorage.getItem('autoThemeToggle') === 'true';
    const currentSettings = autoTheme && isNightTime() ? nightThemeSettings : settings;

    wrapper.style.fontSize = `${settings.fontSize}px`;
    wrapper.style.padding = `${settings.pageMargin}px`;
    wrapper.style.lineHeight = `${settings.lineHeight}`;
    wrapper.style.color = currentSettings.fontColor;
    wrapper.style.backgroundColor = currentSettings.bgColor;
    wrapper.style.fontFamily = settings.fontFamily;
    wrapper.style.letterSpacing = `${settings.letterSpacing}px`;
}

function saveSettingsToLocalStorage(settings) {
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

function loadSettingsFromLocalStorage() {
    const settings = JSON.parse(localStorage.getItem('editorSettings'));
    if (settings) {
        updateEditorSettings(settings);
        document.getElementById('fontSize').value = settings.fontSize;
        document.getElementById('pageMargin').value = settings.pageMargin;
        document.getElementById('lineHeight').value = settings.lineHeight;
        document.getElementById('letterSpacing').value = settings.letterSpacing;
        document.getElementById('fontColor').value = settings.fontColor;
        document.getElementById('bgColor').value = settings.bgColor;
        document.getElementById('fontFamily').value = settings.fontFamily;
    } else {
        resetToDefault();
    }
}

function resetToDefault() {
    updateEditorSettings(defaultSettings);
    document.getElementById('fontSize').value = defaultSettings.fontSize;
    document.getElementById('pageMargin').value = defaultSettings.pageMargin;
    document.getElementById('lineHeight').value = defaultSettings.lineHeight;
    document.getElementById('letterSpacing').value = defaultSettings.letterSpacing;
    document.getElementById('fontColor').value = defaultSettings.fontColor;
    document.getElementById('bgColor').value = defaultSettings.bgColor;
    document.getElementById('fontFamily').value = defaultSettings.fontFamily;
    saveSettingsToLocalStorage(defaultSettings);
}

function toggleAutoTheme() {
    const autoThemeEnabled = document.getElementById('autoThemeToggle').checked;
    localStorage.setItem('autoThemeToggle', autoThemeEnabled);
    applyThemeSettings();
}

function applyThemeSettings() {
    const autoThemeEnabled = localStorage.getItem('autoThemeToggle') === 'true';
    const settings = JSON.parse(localStorage.getItem('editorSettings')) || defaultSettings;

    if (autoThemeEnabled && isNightTime()) {
        updateEditorSettings({
            ...settings,
            ...nightThemeSettings
        });
    } else {
        updateEditorSettings(settings);
    }
}

function isNightTime() {
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6);
}

function updateEditorSettings(settings) {
    const wrapper = editor.getWrapperElement();
    const autoTheme = localStorage.getItem('autoThemeToggle') === 'true';
    const currentSettings = autoTheme && isNightTime() ? {
        ...settings,
        ...nightThemeSettings
    } : settings;

    wrapper.style.fontSize = `${currentSettings.fontSize}px`;
    wrapper.style.padding = `${currentSettings.pageMargin}px`;
    wrapper.style.lineHeight = `${currentSettings.lineHeight}`;
    wrapper.style.color = currentSettings.fontColor;
    wrapper.style.backgroundColor = currentSettings.bgColor;
    wrapper.style.fontFamily = currentSettings.fontFamily;
    wrapper.style.letterSpacing = `${currentSettings.letterSpacing}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettingsFromLocalStorage();
    applyThemeSettings();
    setInterval(applyThemeSettings, 10000); // 每10秒检查
});

//自动
function toggleAutoScroll() {
    if (isAutoScrolling) {
        clearInterval(autoScrollInterval);
        document.querySelector('.footer button:nth-child(3)').style.color = 'white';
        isAutoScrolling = false;
    } else {
        showPopup('popupAutoScroll');
    }
}

function startAutoScroll() {
    const speedInput = document.getElementById('scrollSpeed').value;
    const speed = 1.1 - (speedInput / 5);
    autoScrollInterval = setInterval(() => {
        const scrollInfo = editor.getScrollInfo();
        if (scrollInfo.top + scrollInfo.clientHeight >= scrollInfo.height) {
            clearInterval(autoScrollInterval);
            document.querySelector('.footer button:nth-child(3)').style.color = 'inherit';
            isAutoScrolling = false;
        } else {
            editor.scrollTo(scrollInfo.left, scrollInfo.top + 1); // 每次滚动的距离
        }
    }, speed * 80); // 滚动时间间隔
    document.querySelector('.footer button:nth-child(3)').style.color = '#ff8d00';
    isAutoScrolling = true;
    closePopup('popupAutoScroll');
}

function uploadFile() {
    document.getElementById('fileInput').click();
}

function showToast() {
    var toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(function() {
        toast.className = toast.className.replace("show", "");
    }, 3500);
}

function handleFileUpload() {
    const file = document.getElementById('fileInput').files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        // 假设editor是一个已定义的编辑器实例
        editor.setValue(event.target.result);
        generateCatalog();
    };
    reader.readAsText(file);

    // 获取文件名并更新标题
    const fileName = file.name.split('.').slice(0, -1).join('.');
    document.getElementById('fileTitle').textContent = fileName;

    // 显示吐司提示
    showToast();
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

function applySettings() {
    const encoding = document.getElementById('encodingSelect').value;
    const blockWordsToggle = document.getElementById('blockWordsToggle').checked;
    const blockWordsInput = document.getElementById('blockWordsInput').value;
    const autoThemeToggle = document.getElementById('autoThemeToggle').checked;
    const eyeCareToggle = document.getElementById('eyeCareToggle').checked;

    localStorage.setItem('encoding', encoding);
    localStorage.setItem('blockWordsToggle', blockWordsToggle);
    localStorage.setItem('blockWordsInput', blockWordsInput);
    localStorage.setItem('autoThemeToggle', autoThemeToggle);
    localStorage.setItem('eyeCareToggle', eyeCareToggle);

    applyEncoding();
    applyThemeSettings();
    applyEyeCareMode();
    closePopup('popupSettings');
}


function toggleBlockWords() {
    const blockWordsInput = document.getElementById('blockWordsInput');
    if (document.getElementById('blockWordsToggle').checked) {
        blockWordsInput.style.display = 'block';
        setTimeout(() => {
            blockWordsInput.style.opacity = 1;
        }, 10);
    } else {
        blockWordsInput.style.opacity = 0;
        setTimeout(() => {
            blockWordsInput.style.display = 'none';
        }, 500);
    }
}

function applyBlockWords(content) {
    if (localStorage.getItem('blockWordsToggle') !== 'true') {
        return content;
    }
    const blockWordsInput = localStorage.getItem('blockWordsInput') || '';
    if (!blockWordsInput) {
        return content;
    }
    const blockWords = blockWordsInput.split(/[,，]/)
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .sort((a, b) => b.length - a.length);

    blockWords.forEach(word => {
        const regex = new RegExp(word, 'g');
        content = content.replace(regex, ' ');
    });
    return content;
}

//设置
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    applyEyeCareMode();
});

function applySettings() {
    const encoding = document.getElementById('encodingSelect').value;
    const blockWordsToggle = document.getElementById('blockWordsToggle').checked;
    const blockWordsInput = document.getElementById('blockWordsInput').value;
    const autoThemeToggle = document.getElementById('autoThemeToggle').checked;
    const eyeCareToggle = document.getElementById('eyeCareToggle').checked;

    localStorage.setItem('encoding', encoding);
    localStorage.setItem('blockWordsToggle', blockWordsToggle);
    localStorage.setItem('blockWordsInput', blockWordsInput);
    localStorage.setItem('autoThemeToggle', autoThemeToggle);
    localStorage.setItem('eyeCareToggle', eyeCareToggle);

    applyEncoding();
    applyThemeSettings();
    applyEyeCareMode();
    closePopup('popupSettings');
}

function applyEncoding() {
    const encoding = localStorage.getItem('encoding') || 'utf-8';
    const file = document.getElementById('fileInput') ? document.getElementById('fileInput').files[0] : null;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            let content = new TextDecoder(encoding).decode(event.target.result);
            content = applyBlockWords(content);
            if (typeof editor !== 'undefined') {
                editor.setValue(content);
            }
            generateCatalog(); // 切换编码后重新生成目录
        };
        reader.readAsArrayBuffer(file);
    }
}

function toggleBlockWords() {
    const blockWordsInput = document.getElementById('blockWordsInput');
    if (document.getElementById('blockWordsToggle').checked) {
        blockWordsInput.style.display = 'block';
        setTimeout(() => {
            blockWordsInput.style.opacity = 1;
        }, 10);
    } else {
        blockWordsInput.style.opacity = 0;
        setTimeout(() => {
            blockWordsInput.style.display = 'none';
        }, 500);
    }
}

function applyBlockWords(content) {
    if (localStorage.getItem('blockWordsToggle') !== 'true') {
        return content;
    }
    const blockWordsInput = localStorage.getItem('blockWordsInput') || '';
    if (!blockWordsInput) {
        return content;
    }
    const blockWords = blockWordsInput.split(/[,，]/)
        .map(word => word.trim())
        .filter(word => word.length > 0)
        .sort((a, b) => b.length - a.length);

    blockWords.forEach(word => {
        const regex = new RegExp(word, 'g');
        content = content.replace(regex, ' ');
    });
    return content;
}

function loadSettings() {
    const encoding = localStorage.getItem('encoding');
    const blockWordsToggle = localStorage.getItem('blockWordsToggle') === 'true';
    const blockWordsInput = localStorage.getItem('blockWordsInput');
    const autoThemeToggle = localStorage.getItem('autoThemeToggle') === 'true';
    const eyeCareToggle = localStorage.getItem('eyeCareToggle') === 'true';

    if (encoding) {
        document.getElementById('encodingSelect').value = encoding;
    }
    document.getElementById('blockWordsToggle').checked = blockWordsToggle;
    if (blockWordsToggle) {
        document.getElementById('blockWordsInput').style.display = 'block';
        setTimeout(() => {
            document.getElementById('blockWordsInput').style.opacity = 1;
        }, 10);
    } else {
        document.getElementById('blockWordsInput').style.display = 'none';
        document.getElementById('blockWordsInput').style.opacity = 0;
    }
    if (blockWordsInput) {
        document.getElementById('blockWordsInput').value = blockWordsInput;
    }
    document.getElementById('autoThemeToggle').checked = autoThemeToggle;
    document.getElementById('eyeCareToggle').checked = eyeCareToggle;

    applyThemeSettings();
    applyEyeCareMode();
}

function applyEyeCareMode() {
    const eyeCareToggle = localStorage.getItem('eyeCareToggle') === 'true';
    if (eyeCareToggle) {
        document.body.style.filter = 'sepia(50%) brightness(85%)';
    } else {
        document.body.style.filter = 'none';
    }
}

function toggleEyeCareMode() {
    const eyeCareToggle = document.getElementById('eyeCareToggle').checked;
    if (eyeCareToggle) {
        document.body.style.filter = 'sepia(50%) brightness(85%)';
    } else {
        document.body.style.filter = 'none';
    }
}

//搜索
function toggleSearch() {
    showPopup('popupSearch');
}

function searchContent() {
    const keyword = document.getElementById('searchInput').value.trim();
    const content = editor.getValue();
    const lines = content.split('\n');
    const results = [];

    if (keyword === '') {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    lines.forEach((line, index) => {
        if (line.includes(keyword)) {
            results.push({
                line,
                index
            });
        }
    });

    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<p>没有搜索结果</p>';
        return;
    }

    results.forEach(result => {
        const button = document.createElement('button');
        button.innerText = `${result.line}`;
        button.onclick = () => {
            editor.scrollIntoView({
                line: result.index,
                ch: 0
            });
            closePopup('popupSearch');
        };
        searchResults.appendChild(button);
    });
}

document.getElementById('searchInput').addEventListener('input', searchContent);

function undo() {
    editor.undo();
}

function redo() {
    editor.redo();
}

function selectAll() {
    editor.setSelection({
        line: 0,
        ch: 0
    }, {
        line: editor.lineCount() - 1,
        ch: editor.getLine(editor.lineCount() - 1).length
    });
}

function copyText() {
    const selectedText = editor.getSelection();
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
            console.log('文本已复制到剪贴板');
        }).
        catch(err => {
            console.error('复制文本失败: ', err);
        });
    }
}

function cutText() {
    const selectedText = editor.getSelection();
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
            console.log('文本已剪切到剪贴板');
            editor.replaceSelection(''); // 删除选中的文本
        }).
        catch(err => {
            console.error('剪切文本失败: ', err);
        });
    }
}

function pasteText() {
    navigator.clipboard.readText().then(text => {
        editor.replaceSelection(text);
        console.log('文本已粘贴');
    }).
    catch(err => {
        console.error('粘贴文本失败: ', err);
    });
}

function saveContent() {
    const content = editor.getValue();
    const blob = new Blob([content], {
        type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, fileName + '.txt'); // 文件名
    contentChanged = false;
}

function goBack() {
    if (contentChanged) {
        const confirmation = confirm('文件已修改，是否保存?');
        if (confirmation) {
            saveContent();
            setTimeout(() => window.history.back(), 100); // 等待保存完成后再返回
        } else {
            window.history.back();
        }
    } else {
        window.history.back();
    }
}
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('container')) {
        toggleHeaderFooter();
    }
});

function toggleDropdown() {
    const dropdown = document.getElementById('moreOptions');
    if (dropdown.classList.contains('visible')) {
        dropdown.classList.remove('visible');
    } else {
        dropdown.classList.add('visible');
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    const moreButton = document.querySelector('.more-button');
    const dropdownContent = document.getElementById('moreOptions');

    let dropdownTimeout;

    moreButton.addEventListener('mouseenter', () => {
        clearTimeout(dropdownTimeout);
        dropdownContent.style.display = 'block';
    });

    moreButton.addEventListener('mouseleave', () => {
        dropdownTimeout = setTimeout(() => {
            dropdownContent.style.display = 'none';
        }, 250);
    });

    dropdownContent.addEventListener('mouseenter', () => {
        clearTimeout(dropdownTimeout);
    });

    dropdownContent.addEventListener('mouseleave', () => {
        dropdownTimeout = setTimeout(() => {
            dropdownContent.style.display = 'none';
        }, 250);
    });
});

document.addEventListener('contextmenu', function(e) {
    if (!isEditing) {
        e.preventDefault();
        var contextMenu = document.getElementById('contextMenu');

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        contextMenu.style.display = 'block';
        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        contextMenu.style.display = 'none';

        let x = e.pageX;
        let y = e.pageY;

        if (x + menuWidth > windowWidth) {
            x = windowWidth - menuWidth;
        }
        if (y + menuHeight > windowHeight) {
            y = windowHeight - menuHeight;
        }

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';
    }
});

document.addEventListener('click', function() {
    var contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'none';
});

function searchText() {
    const selectedText = window.getSelection().toString();
    const url = `https://www.bing.com/search?q=${encodeURIComponent(selectedText)}`;
    window.open(url, '_blank');
}

function translateText() {
    const selectedText = window.getSelection().toString();
    const url = `https://www.bing.com/translator?text=${encodeURIComponent(selectedText)}`;
    window.open(url, '_blank');
}

// IndexedDB utility functions
const dbName = 'EditorDB';
const contentStoreName = 'contentStore';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(contentStoreName)) {
                db.createObjectStore(contentStoreName, { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            reject('Database error: ' + event.target.errorCode);
        };
    });
}

function saveToIndexedDB(storeName, data) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event) => {
                reject('Save error: ' + event.target.errorCode);
            };
        });
    });
}

function loadFromIndexedDB(storeName, id) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                reject('Load error: ' + event.target.errorCode);
            };
        });
    });
}

// 监听内容变化
editor.on('change', () => {
    contentChanged = true;
    saveEditorContent();
});

async function saveEditorContent() {
    const content = {
        id: 'editorContent',
        value: editor.getValue()
    };
    await saveToIndexedDB(contentStoreName, content);
}

async function saveScrollPosition() {
    const scrollInfo = editor.getScrollInfo();
    const topVisibleLine = editor.lineAtHeight(scrollInfo.top, 'local');
    const scrollPosition = {
        id: 'scrollPosition',
        value: topVisibleLine
    };
    await saveToIndexedDB(contentStoreName, scrollPosition);
}

// 0.5s保存一次进度
setInterval(() => {
    saveScrollPosition();
}, 500);

// 滚动位置
async function loadScrollPosition() {
    const savedPosition = await loadFromIndexedDB(contentStoreName, 'scrollPosition');
    if (savedPosition && savedPosition.value !== null) {
        const topVisibleLine = parseInt(savedPosition.value, 10);
        const topHeight = editor.heightAtLine(topVisibleLine, 'local');
        
        // 重试机制
        const retryScroll = () => {
            if (editor.getValue() && editor.heightAtLine(topVisibleLine, 'local') >= topHeight) {
                editor.scrollTo(0, topHeight);
            } else {
                setTimeout(retryScroll, 100); // 每100ms重试一次
            }
        };

        retryScroll();
    }
}

// 加载编辑器内容从IndexedDB
async function loadEditorContent() {
    const savedContent = await loadFromIndexedDB(contentStoreName, 'editorContent');
    if (savedContent && savedContent.value) {
        editor.setValue(savedContent.value);
        generateCatalog(); // 生成目录
    }
}

// 恢复内容和行号
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await loadEditorContent();
    setTimeout(loadScrollPosition, 10); // 确保内容加载完成后再恢复滚动位置
});

// 保存进度
editor.on('scroll', () => {
    saveScrollPosition();
});

// 监听窗口关闭事件，保存阅读进度
window.addEventListener('beforeunload', (event) => {
    if (contentChanged) {
        saveEditorContent();
        saveScrollPosition();

        const data = new FormData();
        data.append('editorContent', editor.getValue());
        data.append('scrollPosition', localStorage.getItem('scrollPosition'));
        navigator.sendBeacon('/save-endpoint', data);

        const confirmationMessage = '文件已修改，是否保存?';
        event.returnValue = confirmationMessage; // 标准
        return confirmationMessage; // 旧版
    }
});



//滑块
function updateSliderBackground() {
    const slider = document.getElementById('scrollSpeed');
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, #ff8d00 ${value}%, #ccc ${value}%)`;
}

updateSliderBackground();
initializeEditorSettings();