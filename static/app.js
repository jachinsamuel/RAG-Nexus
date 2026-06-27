// Application State
const state = {
    settings: {
        provider: 'gemini',
        apiKey: '',
        ollamaUrl: 'http://localhost:11434',
        geminiModel: 'gemini-1.5-flash',
        geminiEmbed: 'models/text-embedding-004',
        openaiKey: '',
        openaiModel: 'gpt-4o',
        openaiEmbed: 'text-embedding-3-small',
        claudeKey: '',
        claudeModel: 'claude-3-5-sonnet-latest',
        claudeEmbedProvider: 'gemini',
        ollamaModel: 'llama3',
        ollamaEmbed: 'nomic-embed-text',
        customUrl: '',
        customKey: '',
        customModel: '',
        customEmbed: '',
        chunkSize: 500,
        chunkOverlap: 100,
        topK: 4,
        threshold: 0.3,
        systemPrompt: '',
        webSearch: false
    },
    documents: [],
    messages: [],
    currentSources: [],
    conversations: [],
    activeConversationId: null,
    profileMemories: [],
    skills: []
};

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const docList = document.getElementById('doc-list');
const docCountDisplay = document.getElementById('doc-count');
const chatHistory = document.getElementById('chat-history');
const chatForm = document.getElementById('chat-form');
const queryInput = document.getElementById('query-input');
const sendBtn = document.getElementById('send-btn');
const currentModelDisplay = document.getElementById('current-model-display');
const activeChatTitle = document.getElementById('active-chat-title');
const newChatBtn = document.getElementById('new-chat-btn');

// Lists Panels
const convList = document.getElementById('conv-list');
const memoryList = document.getElementById('memory-list');
const skillsList = document.getElementById('skills-list');

// Manual Input Elements
const manualFactInput = document.getElementById('manual-fact-input');
const addFactBtn = document.getElementById('add-fact-btn');

const manualSkillName = document.getElementById('manual-skill-name');
const manualSkillDesc = document.getElementById('manual-skill-desc');
const manualSkillContent = document.getElementById('manual-skill-content');
const addSkillBtn = document.getElementById('add-skill-btn');

// Drawers
const settingsDrawer = document.getElementById('settings-drawer');
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const contextDrawer = document.getElementById('context-drawer');
const drawerCloseBtn = document.getElementById('drawer-close-btn');
const drawerContent = document.getElementById('drawer-content');

// Settings Input Elements
const providerGemini = document.querySelector('input[name="provider"][value="gemini"]');
const providerOpenai = document.querySelector('input[name="provider"][value="openai"]');
const providerClaude = document.querySelector('input[name="provider"][value="claude"]');
const providerOllama = document.querySelector('input[name="provider"][value="ollama"]');
const providerCustom = document.querySelector('input[name="provider"][value="custom"]');

const geminiOptions = document.getElementById('gemini-options');
const openaiOptions = document.getElementById('openai-options');
const claudeOptions = document.getElementById('claude-options');
const ollamaOptions = document.getElementById('ollama-options');
const customOptions = document.getElementById('custom-options');

const geminiKeyInput = document.getElementById('gemini-key');
const geminiModelSelect = document.getElementById('gemini-model');
const geminiEmbedSelect = document.getElementById('gemini-embed');

const openaiKeyInput = document.getElementById('openai-key');
const openaiModelSelect = document.getElementById('openai-model');
const openaiEmbedSelect = document.getElementById('openai-embed');

const claudeKeyInput = document.getElementById('claude-key');
const claudeModelSelect = document.getElementById('claude-model');
const claudeEmbedProviderSelect = document.getElementById('claude-embed-provider');

const ollamaUrlInput = document.getElementById('ollama-url');
const ollamaModelInput = document.getElementById('ollama-model');
const ollamaEmbedInput = document.getElementById('ollama-embed');

const customUrlInput = document.getElementById('custom-url');
const customKeyInput = document.getElementById('custom-key');
const customModelInput = document.getElementById('custom-model');
const customEmbedInput = document.getElementById('custom-embed');

const chunkSizeSlider = document.getElementById('chunk-size');
const chunkSizeVal = document.getElementById('chunk-size-val');
const chunkOverlapSlider = document.getElementById('chunk-overlap');
const chunkOverlapVal = document.getElementById('chunk-overlap-val');

const topKSlider = document.getElementById('top-k');
const topKVal = document.getElementById('top-k-val');
const thresholdSlider = document.getElementById('threshold');
const thresholdVal = document.getElementById('threshold-val');
const systemPromptInput = document.getElementById('system-prompt');
const webSearchToggle = document.getElementById('web-search-toggle');

// Custom Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Custom Modal Confirmation System
let confirmCallback = null;
function showConfirm(title, message, callback) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    confirmCallback = callback;
    modal.style.display = 'flex';
}

document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    document.getElementById('confirm-modal').style.display = 'none';
    confirmCallback = null;
});

document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    document.getElementById('confirm-modal').style.display = 'none';
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

// Custom Modal Prompt System returning a Promise
function showPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('prompt-modal');
        const input = document.getElementById('prompt-input');
        document.getElementById('prompt-title').textContent = title;
        input.value = defaultValue;
        
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleKeypress);
        };
        
        const handleOk = () => {
            const val = input.value.trim();
            cleanup();
            resolve(val);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const handleKeypress = (e) => {
            if (e.key === 'Enter') {
                handleOk();
            }
        };
        
        const okBtn = document.getElementById('prompt-ok-btn');
        const cancelBtn = document.getElementById('prompt-cancel-btn');
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleKeypress);
    });
}

// Helper to compute correct embedding credentials depending on provider
function getEmbeddingConfig() {
    let provider = state.settings.provider;
    let apiKey = '';
    let ollamaUrl = '';
    let embedModel = '';

    if (provider === 'claude') {
        provider = state.settings.claudeEmbedProvider;
    }

    if (provider === 'gemini') {
        apiKey = state.settings.apiKey;
        embedModel = state.settings.geminiEmbed;
    } else if (provider === 'openai') {
        apiKey = state.settings.openaiKey;
        embedModel = state.settings.openaiEmbed;
    } else if (provider === 'ollama') {
        ollamaUrl = state.settings.ollamaUrl;
        embedModel = state.settings.ollamaEmbed;
    } else if (provider === 'custom') {
        apiKey = state.settings.customKey;
        ollamaUrl = state.settings.customUrl;
        embedModel = state.settings.customEmbed;
    }

    return { provider, apiKey, ollamaUrl, embedModel };
}

// Load configurations from LocalStorage on Init
function initSettings() {
    const saved = localStorage.getItem('symphony_rag_settings');
    if (saved) {
        try {
            state.settings = { ...state.settings, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Could not parse saved settings", e);
        }
    }
    
    // Bind to DOM
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        if (radio.value === state.settings.provider) {
            radio.checked = true;
        }
    });
    
    const optionsBlocks = {
        gemini: geminiOptions,
        openai: openaiOptions,
        claude: claudeOptions,
        ollama: ollamaOptions,
        custom: customOptions
    };
    
    Object.keys(optionsBlocks).forEach(key => {
        if (optionsBlocks[key]) {
            optionsBlocks[key].style.display = (state.settings.provider === key) ? 'block' : 'none';
        }
    });
    
    geminiKeyInput.value = state.settings.apiKey || '';
    geminiModelSelect.value = state.settings.geminiModel || 'gemini-1.5-flash';
    geminiEmbedSelect.value = state.settings.geminiEmbed || 'models/text-embedding-004';
    
    openaiKeyInput.value = state.settings.openaiKey || '';
    openaiModelSelect.value = state.settings.openaiModel || 'gpt-4o';
    openaiEmbedSelect.value = state.settings.openaiEmbed || 'text-embedding-3-small';
    
    claudeKeyInput.value = state.settings.claudeKey || '';
    claudeModelSelect.value = state.settings.claudeModel || 'claude-3-5-sonnet-latest';
    claudeEmbedProviderSelect.value = state.settings.claudeEmbedProvider || 'gemini';
    
    ollamaUrlInput.value = state.settings.ollamaUrl || 'http://localhost:11434';
    ollamaModelInput.value = state.settings.ollamaModel || 'llama3';
    ollamaEmbedInput.value = state.settings.ollamaEmbed || 'nomic-embed-text';
    
    customUrlInput.value = state.settings.customUrl || '';
    customKeyInput.value = state.settings.customKey || '';
    customModelInput.value = state.settings.customModel || '';
    customEmbedInput.value = state.settings.customEmbed || '';
    
    chunkSizeSlider.value = state.settings.chunkSize;
    chunkSizeVal.textContent = state.settings.chunkSize;
    chunkOverlapSlider.value = state.settings.chunkOverlap;
    chunkOverlapVal.textContent = state.settings.chunkOverlap;
    
    topKSlider.value = state.settings.topK;
    topKVal.textContent = state.settings.topK;
    thresholdSlider.value = state.settings.threshold;
    thresholdVal.textContent = Number(state.settings.threshold).toFixed(2);
    systemPromptInput.value = state.settings.systemPrompt;
    webSearchToggle.checked = !!state.settings.webSearch;
    
    updateHeaderDisplay();
    validateInputs();
}

function updateHeaderDisplay() {
    if (state.settings.provider === 'gemini') {
        currentModelDisplay.textContent = `Gemini (${state.settings.geminiModel})`;
    } else if (state.settings.provider === 'openai') {
        currentModelDisplay.textContent = `OpenAI (${state.settings.openaiModel})`;
    } else if (state.settings.provider === 'claude') {
        currentModelDisplay.textContent = `Claude (${state.settings.claudeModel})`;
    } else if (state.settings.provider === 'ollama') {
        currentModelDisplay.textContent = `Ollama (${state.settings.ollamaModel})`;
    } else if (state.settings.provider === 'custom') {
        currentModelDisplay.textContent = `Custom (${state.settings.customModel || 'No Model'})`;
    }
}

function saveSettings() {
    state.settings.provider = document.querySelector('input[name="provider"]:checked').value;
    state.settings.apiKey = geminiKeyInput.value.trim();
    state.settings.geminiModel = geminiModelSelect.value;
    state.settings.geminiEmbed = geminiEmbedSelect.value;
    
    state.settings.openaiKey = openaiKeyInput.value.trim();
    state.settings.openaiModel = openaiModelSelect.value;
    state.settings.openaiEmbed = openaiEmbedSelect.value;
    
    state.settings.claudeKey = claudeKeyInput.value.trim();
    state.settings.claudeModel = claudeModelSelect.value;
    state.settings.claudeEmbedProvider = claudeEmbedProviderSelect.value;
    
    state.settings.ollamaUrl = ollamaUrlInput.value.trim();
    state.settings.ollamaModel = ollamaModelInput.value.trim();
    state.settings.ollamaEmbed = ollamaEmbedInput.value.trim();
    
    state.settings.customUrl = customUrlInput.value.trim();
    state.settings.customKey = customKeyInput.value.trim();
    state.settings.customModel = customModelInput.value.trim();
    state.settings.customEmbed = customEmbedInput.value.trim();
    
    state.settings.chunkSize = parseInt(chunkSizeSlider.value);
    state.settings.chunkOverlap = parseInt(chunkOverlapSlider.value);
    state.settings.topK = parseInt(topKSlider.value);
    state.settings.threshold = parseFloat(thresholdSlider.value);
    state.settings.systemPrompt = systemPromptInput.value.trim();
    state.settings.webSearch = webSearchToggle.checked;
    
    localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
    updateHeaderDisplay();
    validateInputs();
    closeDrawer(settingsDrawer);
    showToast("Configurations saved successfully!", "success");
}

// Drawer management
function openDrawer(drawer) {
    drawer.classList.add('open');
}

function closeDrawer(drawer) {
    drawer.classList.remove('open');
}

settingsBtn.addEventListener('click', () => openDrawer(settingsDrawer));
settingsCloseBtn.addEventListener('click', () => closeDrawer(settingsDrawer));
drawerCloseBtn.addEventListener('click', () => closeDrawer(contextDrawer));
saveSettingsBtn.addEventListener('click', saveSettings);

// Scan local Ollama models
const scanOllamaBtn = document.getElementById('scan-ollama-btn');
if (scanOllamaBtn) {
    scanOllamaBtn.addEventListener('click', async () => {
        const urlInput = document.getElementById('ollama-url');
        const url = urlInput ? urlInput.value.trim() : 'http://localhost:11434';
        scanOllamaBtn.disabled = true;
        scanOllamaBtn.textContent = 'Scanning...';
        try {
            const resp = await fetch(`/api/ollama/discover?url=${encodeURIComponent(url)}`);
            const data = await resp.json();
            if (data.status === 'success') {
                const genDatalist = document.getElementById('ollama-generative-datalist');
                const embedDatalist = document.getElementById('ollama-embed-datalist');
                
                genDatalist.innerHTML = '';
                embedDatalist.innerHTML = '';
                
                data.models.forEach(model => {
                    const opt1 = document.createElement('option');
                    opt1.value = model;
                    genDatalist.appendChild(opt1);
                    
                    const opt2 = document.createElement('option');
                    opt2.value = model;
                    embedDatalist.appendChild(opt2);
                });
                showToast(`Scanned ${data.models.length} local Ollama models successfully!`, 'success');
            } else {
                showToast(`Scan failed: ${data.message}`, 'error');
            }
        } catch (err) {
            showToast(`Error scanning models: ${err.message}`, 'error');
        } finally {
            scanOllamaBtn.disabled = false;
            scanOllamaBtn.textContent = 'Scan';
        }
    });
}


// Tab Switch Navigation
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        
        btn.classList.add('active');
        const paneId = btn.getAttribute('data-tab');
        const pane = document.getElementById(paneId);
        pane.classList.add('active');
        pane.style.display = 'flex';
    });
});

// Provider toggle
document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        const optionsBlocks = {
            gemini: geminiOptions,
            openai: openaiOptions,
            claude: claudeOptions,
            ollama: ollamaOptions,
            custom: customOptions
        };
        Object.keys(optionsBlocks).forEach(key => {
            if (optionsBlocks[key]) {
                optionsBlocks[key].style.display = (val === key) ? 'block' : 'none';
            }
        });
    });
});

// Slider values updating
chunkSizeSlider.addEventListener('input', (e) => { chunkSizeVal.textContent = e.target.value; });
chunkOverlapSlider.addEventListener('input', (e) => { chunkOverlapVal.textContent = e.target.value; });
topKSlider.addEventListener('input', (e) => { topKVal.textContent = e.target.value; });
thresholdSlider.addEventListener('input', (e) => { thresholdVal.textContent = Number(e.target.value).toFixed(2); });

// Fix Send Button usability: Only disable if input is empty
function validateInputs() {
    sendBtn.disabled = queryInput.value.trim().length === 0;
}

// Dropzone Events
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-color)';
    dropzone.style.background = 'rgba(139, 92, 246, 0.05)';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    dropzone.style.background = 'rgba(255, 255, 255, 0.02)';
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    dropzone.style.background = 'rgba(255, 255, 255, 0.02)';
    if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
    }
});

async function uploadFile(file) {
    const originalText = dropzone.querySelector('p').textContent;
    dropzone.querySelector('p').textContent = 'Uploading & Chunking...';
    
    const embedConfig = getEmbeddingConfig();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chunkSize', state.settings.chunkSize);
    formData.append('chunkOverlap', state.settings.chunkOverlap);
    formData.append('provider', embedConfig.provider);
    formData.append('apiKey', embedConfig.apiKey);
    formData.append('ollamaUrl', embedConfig.ollamaUrl);
    formData.append('embedModel', embedConfig.embedModel);

    try {
        const res = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Uploaded ${data.filename} successfully! Added ${data.chunks} chunks.`, "success");
            await loadDocuments();
        } else {
            showToast(`Upload failed: ${data.detail || 'Error'}`, "error");
        }
    } catch (err) {
        console.error(err);
        showToast('Upload failed due to a network or server error.', 'error');
    } finally {
        dropzone.querySelector('p').textContent = originalText;
        fileInput.value = '';
    }
}

async function loadDocuments() {
    try {
        const res = await fetch('/api/documents');
        const data = await res.json();
        state.documents = data;
        docCountDisplay.textContent = `${data.length} file${data.length === 1 ? '' : 's'}`;
        renderDocumentList();
    } catch (err) {
        console.error("Could not load documents catalog", err);
    }
}

function renderDocumentList() {
    docList.innerHTML = '';
    state.documents.forEach(doc => {
        const li = document.createElement('li');
        li.className = 'doc-card';
        
        const info = document.createElement('div');
        info.className = 'doc-info';
        
        const name = document.createElement('span');
        name.className = 'doc-name';
        name.textContent = doc.name;
        
        const meta = document.createElement('span');
        meta.className = 'doc-meta';
        const sizeKb = (doc.size / 1024).toFixed(1);
        meta.textContent = `${sizeKb} KB • ${doc.chunk_count} chunks`;
        
        info.appendChild(name);
        info.appendChild(meta);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'doc-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm("Delete Knowledge Document", `Are you sure you want to delete ${doc.name}?`, async () => {
                await deleteDocument(doc.id);
            });
        });
        
        li.appendChild(info);
        li.appendChild(delBtn);
        
        // Open preview pane on card click
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
            openDocumentPreview(doc.id, doc.name);
        });
        
        docList.appendChild(li);
    });
}

async function deleteDocument(docId) {
    try {
        await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
        showToast("Document deleted successfully", "success");
        await loadDocuments();
    } catch (err) {
        console.error(err);
    }
}

// --- Conversations List & Session Management ---
newChatBtn.addEventListener('click', () => createNewChatSession());

async function createNewChatSession() {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const title = await showPrompt("Enter conversation title:", `Chat at ${timeStr}`);
    if (title === null) return;
    
    try {
        const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title || 'New Conversation' })
        });
        const session = await res.json();
        await loadConversations();
        activateConversation(session.id, session.title);
        showToast("Chat session created", "success");
    } catch (err) {
        console.error("Failed to create chat session", err);
    }
}

async function loadConversations() {
    try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        state.conversations = data;
        renderConversationsList();
    } catch (err) {
        console.error(err);
    }
}

function renderConversationsList() {
    convList.innerHTML = '';
    state.conversations.forEach(c => {
        const card = document.createElement('li');
        card.className = `conv-card ${state.activeConversationId === c.id ? 'active' : ''}`;
        card.addEventListener('click', () => activateConversation(c.id, c.title));
        
        const info = document.createElement('div');
        info.className = 'conv-info';
        
        const title = document.createElement('span');
        title.className = 'conv-title';
        title.textContent = c.title;
        
        const meta = document.createElement('span');
        meta.className = 'conv-meta';
        meta.textContent = c.created_at;
        
        info.appendChild(title);
        info.appendChild(meta);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'conv-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm("Delete Chat Session", `Are you sure you want to delete conversation "${c.title}"?`, async () => {
                await deleteConversation(c.id);
            });
        });
        
        card.appendChild(info);
        card.appendChild(delBtn);
        convList.appendChild(card);
    });
}

async function deleteConversation(id) {
    try {
        await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
        if (state.activeConversationId === id) {
            state.activeConversationId = null;
            state.messages = [];
            activeChatTitle.textContent = "No Active Session";
            renderWelcomeScreen();
        }
        showToast("Conversation deleted", "success");
        await loadConversations();
    } catch (err) {
        console.error(err);
    }
}

async function activateConversation(id, title) {
    state.activeConversationId = id;
    activeChatTitle.textContent = title;
    
    document.querySelectorAll('.conv-card').forEach(card => card.classList.remove('active'));
    renderConversationsList();
    
    try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        const data = await res.json();
        state.messages = data.map(m => ({ role: m.role, content: m.content }));
        
        chatHistory.innerHTML = '';
        if (state.messages.length === 0) {
            renderWelcomeScreen();
        } else {
            state.messages.forEach(m => appendMessage(m.role, m.content));
        }
    } catch (err) {
        console.error(err);
    }
}

function renderWelcomeScreen() {
    chatHistory.innerHTML = '';
}

// --- Profile & Memory Management ---
addFactBtn.addEventListener('click', () => addFactFromInput());
manualFactInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addFactFromInput();
});

async function addFactFromInput() {
    const fact = manualFactInput.value.trim();
    if (!fact) return;
    
    manualFactInput.value = '';
    try {
        const embedConfig = getEmbeddingConfig();
        const res = await fetch('/api/profile-memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fact,
                provider: embedConfig.provider,
                apiKey: embedConfig.apiKey,
                ollamaUrl: embedConfig.ollamaUrl,
                embedModel: embedConfig.embedModel
            })
        });
        if (res.ok) {
            showToast("Memory fact added successfully", "success");
            await loadProfileMemories();
        } else {
            const data = await res.json();
            showToast(`Failed to add memory: ${data.detail}`, "error");
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadProfileMemories() {
    try {
        const res = await fetch('/api/profile-memories');
        const data = await res.json();
        state.profileMemories = data;
        renderProfileMemoriesList();
    } catch (err) {
        console.error(err);
    }
}

function renderProfileMemoriesList() {
    memoryList.innerHTML = '';
    state.profileMemories.forEach(m => {
        const card = document.createElement('li');
        card.className = 'memory-card';
        card.title = "Double-click to edit";
        card.addEventListener('dblclick', () => editProfileMemory(m));
        
        const text = document.createElement('span');
        text.className = 'memory-text';
        text.textContent = m.fact;
        
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.alignItems = 'center';
        actions.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.className = 'memory-edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.style.background = 'none';
        editBtn.style.border = 'none';
        editBtn.style.color = 'var(--text-secondary)';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '14px';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editProfileMemory(m);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'memory-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            showConfirm("Forget Memory", "Do you want this assistant to forget this preference fact?", async () => {
                await deleteProfileMemory(m.id);
            });
        });
        
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        
        card.appendChild(text);
        card.appendChild(actions);
        memoryList.appendChild(card);
    });
}

async function deleteProfileMemory(id) {
    try {
        await fetch(`/api/profile-memories/${id}`, { method: 'DELETE' });
        showToast("Fact forgotten", "success");
        await loadProfileMemories();
    } catch (err) {
        console.error(err);
    }
}

async function editProfileMemory(m) {
    const newFact = await showPrompt("Edit memory fact:", m.fact);
    if (newFact === null || newFact.trim() === '' || newFact.trim() === m.fact) return;
    
    const embedConfig = getEmbeddingConfig();
    try {
        const res = await fetch(`/api/profile-memories/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fact: newFact.trim(),
                provider: embedConfig.provider,
                apiKey: embedConfig.apiKey,
                ollamaUrl: embedConfig.ollamaUrl,
                embedModel: embedConfig.embedModel
            })
        });
        if (res.ok) {
            showToast("Memory fact updated successfully", "success");
            await loadProfileMemories();
        } else {
            const data = await res.json();
            showToast(`Failed to update memory: ${data.detail}`, "error");
        }
    } catch (err) {
        console.error(err);
    }
}

// --- Skills Library Management ---
let editingSkillId = null;

addSkillBtn.addEventListener('click', () => addSkillFromInput());

async function addSkillFromInput() {
    const name = manualSkillName.value.trim();
    const description = manualSkillDesc.value.trim();
    const content = manualSkillContent.value.trim();
    
    if (!name || !description || !content) {
        showToast("Please fill out all skill fields first.", "error");
        return;
    }
    
    const embedConfig = getEmbeddingConfig();
    const payload = {
        name, description, content,
        provider: embedConfig.provider,
        apiKey: embedConfig.apiKey,
        ollamaUrl: embedConfig.ollamaUrl,
        embedModel: embedConfig.embedModel
    };
    
    try {
        let res;
        if (editingSkillId) {
            res = await fetch(`/api/skills/${editingSkillId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (res.ok) {
            showToast(editingSkillId ? "Custom skill updated successfully" : "Custom skill saved successfully", "success");
            editingSkillId = null;
            addSkillBtn.textContent = 'Save Skill';
            manualSkillName.value = '';
            manualSkillDesc.value = '';
            manualSkillContent.value = '';
            await loadSkills();
        } else {
            const data = await res.json();
            showToast(`Failed: ${data.detail}`, "error");
        }
    } catch (err) {
        console.error(err);
    }
}

function startEditingSkill(s) {
    editingSkillId = s.id;
    manualSkillName.value = s.name;
    manualSkillDesc.value = s.description;
    manualSkillContent.value = s.content;
    addSkillBtn.textContent = 'Update Skill';
    manualSkillName.focus();
    
    // Switch to skills tab automatically to improve UX
    const skillsTabBtn = document.querySelector('.tab-btn[data-tab="skills-pane"]');
    if (skillsTabBtn) {
        skillsTabBtn.click();
    }
    
    showToast("Populated skill inputs for editing", "info");
}

async function loadSkills() {
    try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        state.skills = data;
        renderSkillsList();
    } catch (err) {
        console.error(err);
    }
}

function renderSkillsList() {
    skillsList.innerHTML = '';
    state.skills.forEach(s => {
        const card = document.createElement('li');
        card.className = 'skill-card';
        card.title = "Click to toggle content, double-click to edit";
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startEditingSkill(s);
        });
        
        const header = document.createElement('div');
        header.className = 'skill-card-header';
        
        const title = document.createElement('span');
        title.className = 'skill-card-title';
        title.textContent = s.name;
        
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.alignItems = 'center';
        actions.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.className = 'skill-edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.style.background = 'none';
        editBtn.style.border = 'none';
        editBtn.style.color = 'var(--text-secondary)';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '14px';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditingSkill(s);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'skill-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            showConfirm("Delete Skill", `Are you sure you want to delete the skill "${s.name}"?`, async () => {
                await deleteSkill(s.id);
            });
        });
        
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        
        header.appendChild(title);
        header.appendChild(actions);
        
        const desc = document.createElement('span');
        desc.className = 'skill-card-desc';
        desc.textContent = s.description;
        
        const body = document.createElement('div');
        body.className = 'skill-card-body';
        body.textContent = s.content;
        body.style.display = 'none';
        
        card.appendChild(header);
        card.appendChild(desc);
        card.appendChild(body);
        
        card.addEventListener('click', () => {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });
        
        skillsList.appendChild(card);
    });
}

async function deleteSkill(id) {
    try {
        await fetch(`/api/skills/${id}`, { method: 'DELETE' });
        showToast("Skill deleted successfully", "success");
        await loadSkills();
    } catch (err) {
        console.error(err);
    }
}

// --- Markdown Parser & Utilities ---
function parseTables(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    let isHeader = true;
    const result = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
            if (trimmed.includes('---')) {
                isHeader = false;
                continue;
            }
            if (!inTable) {
                inTable = true;
                isHeader = true;
                tableHtml = '<div class="table-container"><table class="neo-table">';
            }
            const tag = isHeader ? 'th' : 'td';
            tableHtml += '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
            if (isHeader) isHeader = false;
        } else {
            if (inTable) {
                inTable = false;
                tableHtml += '</table></div>';
                result.push(tableHtml);
            }
            result.push(line);
        }
    }
    if (inTable) {
        tableHtml += '</table></div>';
        result.push(tableHtml);
    }
    return result.join('\n');
}

function parseTableBlock(tableLines) {
    let isHeader = true;
    let html = '<div class="table-container"><table class="neo-table">';
    for (let line of tableLines) {
        const trimmed = line.trim();
        if (trimmed.includes('---')) {
            isHeader = false;
            continue;
        }
        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
        const tag = isHeader ? 'th' : 'td';
        html += '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
        if (isHeader) isHeader = false;
    }
    html += '</table></div>';
    return html;
}

function parseMarkdown(text) {
    if (!text) return '';
    
    // Step A: Escape raw HTML (protect against injection)
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Step B: Fenced code blocks extraction to placeholders
    const codeBlocks = [];
    html = html.replace(/`{2,}(\w*)[ \r]*\n([\s\S]*?)`{2,}/g, (match, lang, code) => {
        const cleanLang = lang.trim() || 'code';
        const blockIndex = codeBlocks.length;
        codeBlocks.push(`
        <div class="code-container">
            <div class="code-header">
                <span class="code-lang">${cleanLang}</span>
                <div class="code-actions">
                    <button class="code-action-btn wrap-btn" onclick="toggleWordWrap(this)">Wrap</button>
                    <button class="code-action-btn copy-btn" onclick="copyToClipboard(this)">Copy</button>
                    <button class="code-action-btn download-btn" onclick="downloadCode(this, '${cleanLang}')">Download</button>
                </div>
            </div>
            <pre class="language-${cleanLang}"><code class="language-${cleanLang}">${code.trim()}</code></pre>
        </div>`);
        return `\n\n__CODE_BLOCK_${blockIndex}__\n\n`;
    });

    // Step C: Markdown Tables parsing to placeholders
    const tables = [];
    const lines = html.split('\n');
    let inTable = false;
    let tableLines = [];
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableLines = [line];
            } else {
                tableLines.push(line);
            }
        } else {
            if (inTable) {
                inTable = false;
                const tableHtml = parseTableBlock(tableLines);
                const tableIndex = tables.length;
                tables.push(tableHtml);
                processedLines.push(`__TABLE_BLOCK_${tableIndex}__`);
                tableLines = [];
            }
            processedLines.push(line);
        }
    }
    if (inTable) {
        const tableHtml = parseTableBlock(tableLines);
        const tableIndex = tables.length;
        tables.push(tableHtml);
        processedLines.push(`__TABLE_BLOCK_${tableIndex}__`);
    }
    html = processedLines.join('\n');
    
    // Step D: Inline formatting (done only on text segments)
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Step E: Split by double newlines into clean blocks
    const paragraphs = html.split(/\n\s*\n/);
    const renderedParagraphs = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        
        // Restore code blocks if matched
        const codeMatch = trimmed.match(/^__CODE_BLOCK_(\d+)__$/);
        if (codeMatch) {
            const idx = parseInt(codeMatch[1]);
            return codeBlocks[idx];
        }
        
        // Restore table blocks if matched
        const tableMatch = trimmed.match(/^__TABLE_BLOCK_(\d+)__$/);
        if (tableMatch) {
            const idx = parseInt(tableMatch[1]);
            return tables[idx];
        }

        // Render Headings
        if (trimmed.startsWith('### ')) {
            return `<h3>${trimmed.substring(4)}</h3>`;
        }
        if (trimmed.startsWith('## ')) {
            return `<h2>${trimmed.substring(3)}</h2>`;
        }
        if (trimmed.startsWith('# ')) {
            return `<h1>${trimmed.substring(2)}</h1>`;
        }
        
        // Wrap normal paragraph & convert single newlines to br
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });
    
    return renderedParagraphs.filter(p => p !== '').join('');
}

function renderMath(element) {
    if (window.renderMathInElement) {
        window.renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }
}

function showCitationsInDrawer(messageSources, highlightIndex) {
    drawerContent.innerHTML = '';
    messageSources.forEach((src, idx) => {
        const card = document.createElement('div');
        const isHighlighted = (idx + 1 === highlightIndex);
        card.className = `citation-card ${isHighlighted ? 'highlighted' : ''}`;
        card.id = `citation-card-${idx + 1}`;
        card.innerHTML = `
            <div class="citation-meta">
                <span class="citation-doc">Source [${idx + 1}]: ${src.doc_name} (Chunk ${src.idx})</span>
                <span class="citation-score">Sim: ${(src.similarity * 100).toFixed(1)}%</span>
            </div>
            <div class="citation-text">${src.text}</div>
        `;
        drawerContent.appendChild(card);
    });
    openDrawer(contextDrawer);
    
    const targetCard = document.getElementById(`citation-card-${highlightIndex}`);
    if (targetCard) {
        setTimeout(() => {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
    }
    
    // Automatically open split-screen preview and focus the referenced chunk
    const clickedSource = messageSources[highlightIndex - 1];
    if (clickedSource && clickedSource.doc_id) {
        openDocumentPreview(clickedSource.doc_id, clickedSource.doc_name, clickedSource.id);
    }
}

function appendMessage(role, content, sources = null) {
    const welcome = chatHistory.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;
    
    const msgContent = document.createElement('div');
    msgContent.className = 'message-content';
    msgContent.innerHTML = parseMarkdown(content);
    bubble.appendChild(msgContent);
    
    if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
        Prism.highlightAllUnder(msgContent);
    }
    
    renderMath(msgContent);
    
    if (sources && sources.length > 0) {
        const sourcesContainer = document.createElement('div');
        sourcesContainer.className = 'sources-container';
        
        sources.forEach((src, idx) => {
            const badge = document.createElement('span');
            badge.className = 'source-badge';
            badge.textContent = `[${idx + 1}] ${src.doc_name}`;
            badge.addEventListener('click', () => {
                showCitationsInDrawer(sources, idx + 1);
            });
            sourcesContainer.appendChild(badge);
        });
        bubble.appendChild(sourcesContainer);
    }
    
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return bubble;
}

queryInput.addEventListener('input', () => {
    validateInputs();
});

// --- Chat Form Handler & Streaming API Integration ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;
    
    // Check Settings configurations: If provider is selected and API key/URL is missing, alert the user!
    const activeProvider = state.settings.provider;
    if (activeProvider === 'gemini' && !state.settings.apiKey.trim()) {
        showToast("Gemini API key is required. Please set it in configurations.", "error");
        openDrawer(settingsDrawer);
        return;
    }
    if (activeProvider === 'openai' && !state.settings.openaiKey.trim()) {
        showToast("OpenAI API key is required. Please set it in configurations.", "error");
        openDrawer(settingsDrawer);
        return;
    }
    if (activeProvider === 'claude' && !state.settings.claudeKey.trim()) {
        showToast("Claude API key is required. Please set it in configurations.", "error");
        openDrawer(settingsDrawer);
        return;
    }
    if (activeProvider === 'custom' && !state.settings.customUrl.trim()) {
        showToast("Custom Base URL is required. Please set it in configurations.", "error");
        openDrawer(settingsDrawer);
        return;
    }
    
    queryInput.value = '';
    validateInputs();
    
    // Auto-create chat session if none is active
    if (!state.activeConversationId) {
        const shortTitle = query.substring(0, 25) + (query.length > 25 ? '...' : '');
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: shortTitle })
            });
            const session = await res.json();
            state.activeConversationId = session.id;
            activeChatTitle.textContent = session.title;
            await loadConversations();
        } catch (err) {
            console.error("Auto session creation failed", err);
            return;
        }
    }
    
    state.messages.push({ role: 'user', content: query });
    appendMessage('user', query);
    
    const assistantBubble = appendMessage('assistant', 'Reflecting & gathering memory context...');
    const assistantContentDiv = assistantBubble.querySelector('.message-content');
    
    queryInput.disabled = true;
    sendBtn.disabled = true;
    
    try {
        let apiKey = '';
        let ollamaUrl = '';
        let genModel = '';
        let embedModel = '';

        if (activeProvider === 'gemini') {
            apiKey = state.settings.apiKey;
            genModel = state.settings.geminiModel;
            embedModel = state.settings.geminiEmbed;
        } else if (activeProvider === 'openai') {
            apiKey = state.settings.openaiKey;
            genModel = state.settings.openaiModel;
            embedModel = state.settings.openaiEmbed;
        } else if (activeProvider === 'claude') {
            const embedConfig = getEmbeddingConfig();
            apiKey = `${state.settings.claudeKey.trim()}|||${embedConfig.provider}|||${embedConfig.apiKey.trim()}`;
            ollamaUrl = embedConfig.ollamaUrl;
            genModel = state.settings.claudeModel;
            embedModel = embedConfig.embedModel;
        } else if (activeProvider === 'ollama') {
            ollamaUrl = state.settings.ollamaUrl;
            genModel = state.settings.ollamaModel;
            embedModel = state.settings.ollamaEmbed;
        } else if (activeProvider === 'custom') {
            apiKey = state.settings.customKey;
            ollamaUrl = state.settings.customUrl;
            genModel = state.settings.customModel;
            embedModel = state.settings.customEmbed;
        }

        const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: state.messages,
                provider: activeProvider,
                conversationId: state.activeConversationId,
                apiKey: apiKey,
                ollamaUrl: ollamaUrl,
                genModel: genModel,
                embedModel: embedModel,
                topK: state.settings.topK,
                threshold: state.settings.threshold,
                systemPrompt: state.settings.systemPrompt,
                webSearch: !!state.settings.webSearch,
                agentMode: (() => {
                    const btn = document.getElementById('agent-toggle-btn');
                    return btn ? btn.classList.contains('active') : false;
                })()
            })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Streaming connection failed.');
        }
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let assistantReply = '';
        let sources = [];
        let firstTextChunk = true;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            
            let currentEvent = '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.startsWith('event: ')) {
                    currentEvent = trimmed.substring(7);
                } else if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.substring(6);
                    if (currentEvent === 'sources') {
                        sources = JSON.parse(dataStr);
                        state.currentSources = sources;
                    } else if (currentEvent === 'warning') {
                        const warn = JSON.parse(dataStr);
                        showToast(warn.message, 'error');
                    } else if (currentEvent === 'agent_step') {
                        const step = JSON.parse(dataStr);
                        if (firstTextChunk) {
                            assistantContentDiv.innerHTML = '';
                            firstTextChunk = false;
                        }
                        const stepDiv = document.createElement('div');
                        stepDiv.className = 'agent-step-log';
                        stepDiv.style.margin = '8px 0';
                        stepDiv.style.padding = '6px 12px';
                        stepDiv.style.borderLeft = '3px solid var(--cyan-color)';
                        stepDiv.style.fontFamily = "'Space Grotesk', sans-serif";
                        stepDiv.style.fontSize = '11.5px';
                        stepDiv.style.fontWeight = '700';
                        stepDiv.style.background = 'var(--bg-card)';
                        stepDiv.style.color = 'var(--text-primary)';
                        stepDiv.style.borderRadius = '2px';
                        stepDiv.innerHTML = `&raquo; [${step.agent.toUpperCase()}] &nbsp;${step.message}`;
                        assistantContentDiv.appendChild(stepDiv);
                        chatHistory.scrollTop = chatHistory.scrollHeight;
                    } else if (currentEvent === 'text') {
                        const text = JSON.parse(dataStr);
                        if (firstTextChunk) {
                            assistantContentDiv.innerHTML = '';
                            firstTextChunk = false;
                        }
                        assistantReply += text;
                        assistantContentDiv.innerHTML = parseMarkdown(assistantReply);
                        chatHistory.scrollTop = chatHistory.scrollHeight;
                    } else if (currentEvent === 'error') {
                        const err = JSON.parse(dataStr);
                        assistantContentDiv.innerHTML = `<span style="color: var(--red-alert);">Error: ${err}</span>`;
                    }
                }
            }
        }
        
        if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
            Prism.highlightAllUnder(assistantContentDiv);
        }
        renderMath(assistantContentDiv);
        
        state.messages.push({ role: 'assistant', content: assistantReply });
        
        if (sources.length > 0) {
            const sourcesContainer = document.createElement('div');
            sourcesContainer.className = 'sources-container';
            
            sources.forEach((src, idx) => {
                const badge = document.createElement('span');
                badge.className = 'source-badge';
                badge.textContent = `[${idx + 1}] ${src.doc_name}`;
                badge.addEventListener('click', () => {
                    showCitationsInDrawer(sources, idx + 1);
                });
                sourcesContainer.appendChild(badge);
            });
            assistantBubble.appendChild(sourcesContainer);
        }
        
        setTimeout(async () => {
            await loadProfileMemories();
            await loadSkills();
        }, 1500);
        
    } catch (err) {
        console.error(err);
        assistantContentDiv.innerHTML = `<span style="color: var(--red-alert);">Error: ${err.message}</span>`;
    } finally {
        queryInput.disabled = false;
        queryInput.focus();
        validateInputs();
    }
});

// App Startup Initializations
window.addEventListener('DOMContentLoaded', async () => {
    initSettings();
    await loadDocuments();
    await loadConversations();
    await loadProfileMemories();
    await loadSkills();
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportConversation());
    }
    initVoiceInput();
    setupAutocomplete();
});

// Global Helpers for code-block actions
window.copyToClipboard = function(button) {
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('pre code');
    const rawCode = codeElement.innerText;
    
    navigator.clipboard.writeText(rawCode).then(() => {
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
    });
};

window.downloadCode = function(button, lang) {
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('pre code');
    const rawCode = codeElement.innerText;
    
    const extMap = {
        'python': 'py', 'py': 'py',
        'javascript': 'js', 'js': 'js',
        'typescript': 'ts', 'ts': 'ts',
        'html': 'html', 'css': 'css',
        'json': 'json', 'bash': 'sh', 'sh': 'sh',
        'cpp': 'cpp', 'c': 'c', 'rust': 'rs', 'rs': 'rs',
        'go': 'go', 'java': 'java', 'sql': 'sql',
        'yaml': 'yaml', 'yml': 'yaml', 'markdown': 'md', 'md': 'md'
    };
    const ext = extMap[lang.toLowerCase()] || 'txt';
    const filename = `code_${Date.now()}.${ext}`;
    
    const blob = new Blob([rawCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    button.textContent = 'Downloaded!';
    setTimeout(() => {
        button.textContent = 'Download';
    }, 2000);
};

window.toggleWordWrap = function(button) {
    const codeContainer = button.closest('.code-container');
    const pre = codeContainer.querySelector('pre');
    pre.classList.toggle('wrap-lines');
    button.classList.toggle('active');
    if (pre.classList.contains('wrap-lines')) {
        button.textContent = 'Unwrap';
    } else {
        button.textContent = 'Wrap';
    }
};

function exportConversation() {
    if (!state.activeConversationId || state.messages.length === 0) {
        showToast("No active conversation to export.", "info");
        return;
    }
    
    let mdText = `# Conversation: ${activeChatTitle.textContent}\nExported on: ${new Date().toLocaleString()}\n\n---\n\n`;
    state.messages.forEach(m => {
        const sender = m.role === 'user' ? 'User' : 'Assistant';
        mdText += `## ${sender}\n\n${m.content}\n\n---\n\n`;
    });
    
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation_${state.activeConversationId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Conversation exported successfully!", "success");
}

function initVoiceInput() {
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    let isListening = false;
    
    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
    
    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        micBtn.title = "Listening... Click to stop";
        showToast("Voice input active. Speak now...", "info");
    };
    
    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.title = "Voice Input";
    };
    
    recognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        if (e.error !== 'no-speech') {
            showToast(`Speech recognition error: ${e.error}`, "error");
        }
        isListening = false;
        micBtn.classList.remove('listening');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (queryInput) {
            queryInput.value = (queryInput.value + ' ' + transcript).trim();
            validateInputs();
            queryInput.focus();
        }
    };
}

// --- Inline Autocomplete Logic ---
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
let selectedIndex = -1;
let filteredItems = [];
let triggerChar = ''; // '/' or '@'
let triggerIndex = -1;

// Bind Agent Mode toggle button inside chat bar
const agentToggleBtn = document.getElementById('agent-toggle-btn');
if (agentToggleBtn) {
    agentToggleBtn.addEventListener('click', () => {
        agentToggleBtn.classList.toggle('active');
        const isActive = agentToggleBtn.classList.contains('active');
        showToast(isActive ? "Agent Mode enabled" : "Agent Mode disabled", "info");
    });
}

function setupAutocomplete() {
    if (!queryInput || !autocompleteDropdown) return;
    
    queryInput.addEventListener('input', (e) => {
        const text = queryInput.value;
        const cursorPosition = queryInput.selectionStart;
        
        // Find the word preceding the cursor
        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastWordStart = textBeforeCursor.lastIndexOf(' ');
        const lastWord = lastWordStart === -1 ? textBeforeCursor : textBeforeCursor.slice(lastWordStart + 1);
        
        if (lastWord.startsWith('/') || lastWord.startsWith('@')) {
            triggerChar = lastWord[0];
            triggerIndex = lastWordStart === -1 ? 0 : lastWordStart + 1;
            const query = lastWord.slice(1).toLowerCase();
            
            showAutocomplete(triggerChar, query);
        } else {
            hideAutocomplete();
        }
    });
    
    queryInput.addEventListener('keydown', (e) => {
        if (autocompleteDropdown.style.display === 'none') return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % filteredItems.length;
            updateSelectedAutocomplete();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
            updateSelectedAutocomplete();
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
                e.preventDefault();
                selectAutocompleteItem(filteredItems[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideAutocomplete();
        }
    });
    
    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!autocompleteDropdown.contains(e.target) && e.target !== queryInput) {
            hideAutocomplete();
        }
    });
}

function showAutocomplete(char, query) {
    autocompleteDropdown.innerHTML = '';
    selectedIndex = -1;
    
    if (char === '/') {
        // Filter skills
        filteredItems = state.skills.filter(s => s.name.toLowerCase().includes(query)).map(s => ({
            name: s.name,
            type: 'skill',
            value: s.name + ': ' + s.description
        }));
    } else if (char === '@') {
        // Filter documents
        filteredItems = state.documents.filter(d => d.name && d.name.toLowerCase().includes(query)).map(d => ({
            name: d.name,
            type: 'doc',
            value: d.name
        }));
    }
    
    if (filteredItems.length === 0) {
        hideAutocomplete();
        return;
    }
    
    filteredItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `
            <span class="item-type">${item.type}</span>
            <span class="item-name">${item.name}</span>
        `;
        div.addEventListener('click', () => {
            selectAutocompleteItem(item);
        });
        autocompleteDropdown.appendChild(div);
    });
    
    autocompleteDropdown.style.display = 'flex';
}

function updateSelectedAutocomplete() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectAutocompleteItem(item) {
    const text = queryInput.value;
    const cursorPosition = queryInput.selectionStart;
    
    const beforeTrigger = text.slice(0, triggerIndex);
    const afterCursor = text.slice(cursorPosition);
    
    // Insert autocomplete value
    const insertion = triggerChar + item.name;
    queryInput.value = beforeTrigger + insertion + ' ' + afterCursor;
    
    // Position cursor after the completed term
    const newCursorPos = triggerIndex + insertion.length + 1;
    queryInput.setSelectionRange(newCursorPos, newCursorPos);
    
    hideAutocomplete();
    validateInputs();
    queryInput.focus();
}

function hideAutocomplete() {
    autocompleteDropdown.style.display = 'none';
    filteredItems = [];
    selectedIndex = -1;
}

// --- Split-Screen Document Previewer Logic ---
async function openDocumentPreview(docId, docName, highlightChunkId = null) {
    const previewPane = document.getElementById('preview-pane');
    const titleEl = document.getElementById('preview-doc-title');
    const bodyEl = document.getElementById('preview-body');
    
    if (!previewPane || !titleEl || !bodyEl) return;
    
    titleEl.textContent = docName;
    previewPane.style.display = 'flex';
    
    // Track current loaded document ID to prevent duplicate fetches
    const isSameDoc = (previewPane.dataset.currentDocId === docId);
    previewPane.dataset.currentDocId = docId;
    
    const fetchAndRender = async () => {
        const resp = await fetch(`/api/documents/${docId}/chunks`);
        const data = await resp.json();
        if (data.status === 'success') {
            bodyEl.innerHTML = '';
            data.chunks.forEach(chunk => {
                const chunkDiv = document.createElement('div');
                chunkDiv.className = 'preview-chunk';
                chunkDiv.id = `preview-chunk-${chunk.id}`;
                chunkDiv.innerHTML = `
                    <div class="chunk-header">
                        <span>Chunk #${chunk.idx + 1}</span>
                        <span>ID: ${chunk.id.substring(0, 8)}</span>
                    </div>
                    <div class="chunk-text">${escapeHtml(chunk.text)}</div>
                `;
                bodyEl.appendChild(chunkDiv);
            });
        } else {
            bodyEl.innerHTML = `<div style="color:var(--red-alert); padding:20px;">Failed to load document: ${data.message}</div>`;
        }
    };
    
    if (!isSameDoc) {
        bodyEl.innerHTML = '<div style="text-align:center; padding:20px;">Loading document text...</div>';
        await fetchAndRender();
    }
    
    // Remove previous highlights
    bodyEl.querySelectorAll('.preview-chunk').forEach(el => el.classList.remove('highlighted'));
    
    if (highlightChunkId) {
        const chunkEl = document.getElementById(`preview-chunk-${highlightChunkId}`);
        if (chunkEl) {
            chunkEl.classList.add('highlighted');
            setTimeout(() => {
                chunkEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 120);
        }
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Bind preview close button
const previewCloseBtn = document.getElementById('preview-close-btn');
if (previewCloseBtn) {
    previewCloseBtn.addEventListener('click', () => {
        document.getElementById('preview-pane').style.display = 'none';
        const previewPane = document.getElementById('preview-pane');
        delete previewPane.dataset.currentDocId;
    });
}

