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
        ollamaModel: 'qwen2.5-coder:3b',
        ollamaEmbed: 'nomic-embed-text',
        customUrl: 'https://integrate.api.nvidia.com/v1',
        customKey: '',
        customModel: 'meta/llama-3.2-11b-vision-instruct',
        customEmbed: 'nvidia/embed-qa-4',
        chunkSize: 500,
        chunkOverlap: 100,
        topK: 4,
        threshold: 0.3,
        systemPrompt: '',
        webSearch: false,
        workspacePath: '',
        workspaceHistory: [],
        retrievalStrategy: 'hybrid',
        theme: 'light',
        designStyle: 'minimalist'
    },
    documents: [],
    messages: [],
    currentSources: [],
    conversations: [],
    activeConversationId: null,
    profileMemories: [],
    skills: [],
    workspaceFiles: [],
    generatingConversations: {},
    activeStreams: {},
    selectedAttachments: [],
    deepResearch: false,
    promptHistory: [],
    promptHistoryIndex: -1,
    tempTypedPrompt: ''
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
const drawerContent = document.getElementById('citations-tab-pane');

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

// Workspace DOM Elements
const workspacePathInput = document.getElementById('workspace-path');
const previewSaveBtn = document.getElementById('preview-save-btn');

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
        const okBtn = document.getElementById('prompt-ok-btn');
        const cancelBtn = document.getElementById('prompt-cancel-btn');
        
        if (!modal || !input || !okBtn || !cancelBtn) {
            resolve(defaultValue);
            return;
        }
        
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
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleKeypress);
    });
}

// Custom Modal Diff System returning a Promise
let diffResolve = null;
function showDiffModal(oldContent, newContent) {
    return new Promise((resolve) => {
        const modal = document.getElementById('diff-modal');
        const container = document.getElementById('diff-container-pane');
        if (!modal || !container) {
            resolve(true); // Fallback
            return;
        }
        
        container.innerHTML = generateSimpleDiffHTML(oldContent, newContent);
        modal.style.display = 'flex';
        diffResolve = resolve;
    });
}

const diffCancelBtn = document.getElementById('diff-cancel-btn');
if (diffCancelBtn) {
    diffCancelBtn.addEventListener('click', () => {
        document.getElementById('diff-modal').style.display = 'none';
        if (diffResolve) diffResolve(false);
        diffResolve = null;
    });
}

const diffConfirmBtn = document.getElementById('diff-confirm-btn');
if (diffConfirmBtn) {
    diffConfirmBtn.addEventListener('click', () => {
        document.getElementById('diff-modal').style.display = 'none';
        if (diffResolve) diffResolve(true);
        diffResolve = null;
    });
}

function generateSimpleDiffHTML(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    
    const dp = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));
    for (let i = 1; i <= oldLines.length; i++) {
        for (let j = 1; j <= newLines.length; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    let i = oldLines.length;
    let j = newLines.length;
    const diff = [];
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            diff.unshift({ type: 'unchanged', text: oldLines[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'added', text: newLines[j - 1] });
            j--;
        } else {
            diff.unshift({ type: 'removed', text: oldLines[i - 1] });
            i--;
        }
    }
    
    let html = '<div style="font-family: \'Courier New\', Courier, monospace; font-size: 12px; line-height: 1.6; max-height: 350px; overflow-y: auto; text-align: left; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; white-space: pre; border: 1px solid var(--border-color);">';
    diff.forEach((line) => {
        let bgColor = 'transparent';
        let prefix = ' ';
        let textColor = 'inherit';
        if (line.type === 'added') {
            bgColor = 'rgba(16, 185, 129, 0.15)';
            textColor = '#10b981';
            prefix = '+';
        } else if (line.type === 'removed') {
            bgColor = 'rgba(244, 63, 94, 0.15)';
            textColor = '#f43f5e';
            prefix = '-';
        }
        
        const escapedText = escapeHtml(line.text);
        html += `<div style="background-color: ${bgColor}; color: ${textColor}; padding: 1px 4px; display: flex; gap: 8px; border-radius: 2px;">` +
                `<span style="opacity: 0.5; width: 14px; user-select: none;">${prefix}</span>` +
                `<span style="flex: 1; white-space: pre-wrap; word-break: break-all;">${escapedText}</span>` +
                `</div>`;
    });
    html += '</div>';
    return html;
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
    state.settings.workspaceHistory = state.settings.workspaceHistory || [];
    if (state.settings.workspacePath && !state.settings.workspaceHistory.includes(state.settings.workspacePath)) {
        state.settings.workspaceHistory.push(state.settings.workspacePath);
    }
    
    // Auto-migrate decommissioned models and stale defaults
    if (state.settings.ollamaModel === 'llama3' || !state.settings.ollamaModel) {
        state.settings.ollamaModel = 'qwen2.5-coder:3b';
    }
    const currentCustom = (state.settings.customModel || '').trim();
    const isDecommissionedCustom = !currentCustom || 
        currentCustom === 'meta/llama-3.1-8b-instruct' || 
        currentCustom === 'meta/llama-3.3-70b-instruct' || 
        currentCustom === 'meta/llama-3.1-70b-instruct' ||
        currentCustom === 'nvidia/llama-3.1-nemotron-70b-instruct' ||
        currentCustom.includes('llama-3.1') ||
        currentCustom.includes('llama-3.3') ||
        currentCustom.includes('nemotron-70b');

    if (isDecommissionedCustom) {
        state.settings.customModel = 'meta/llama-3.2-11b-vision-instruct';
    }
    if (!state.settings.customUrl) {
        state.settings.customUrl = 'https://integrate.api.nvidia.com/v1';
    }
    const currentEmbed = (state.settings.customEmbed || '').trim();
    const isStaleEmbed = !currentEmbed || 
        currentEmbed === 'nvidia/embeddings-nv-embed-qa-4' || 
        currentEmbed === 'baai/bge-large-en-v1.5';
    if (isStaleEmbed) {
        state.settings.customEmbed = 'nvidia/embed-qa-4';
    }
    try {
        localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
    } catch(e) {}
    
    // Bind to DOM
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        if (radio.value === state.settings.provider) {
            radio.checked = true;
        }
    });
    const chatModelSelectElem = document.getElementById('chat-model-select');
    if (chatModelSelectElem && state.settings.provider) {
        chatModelSelectElem.value = state.settings.provider;
    }
    
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
    
    if (geminiKeyInput) geminiKeyInput.value = state.settings.apiKey || '';
    if (geminiModelSelect) geminiModelSelect.value = state.settings.geminiModel || 'gemini-1.5-flash';
    if (geminiEmbedSelect) geminiEmbedSelect.value = state.settings.geminiEmbed || 'models/text-embedding-004';
    
    if (openaiKeyInput) openaiKeyInput.value = state.settings.openaiKey || '';
    if (openaiModelSelect) openaiModelSelect.value = state.settings.openaiModel || 'gpt-4o';
    if (openaiEmbedSelect) openaiEmbedSelect.value = state.settings.openaiEmbed || 'text-embedding-3-small';
    
    if (claudeKeyInput) claudeKeyInput.value = state.settings.claudeKey || '';
    if (claudeModelSelect) claudeModelSelect.value = state.settings.claudeModel || 'claude-3-5-sonnet-latest';
    if (claudeEmbedProviderSelect) claudeEmbedProviderSelect.value = state.settings.claudeEmbedProvider || 'gemini';
    
    if (ollamaUrlInput) ollamaUrlInput.value = state.settings.ollamaUrl || 'http://localhost:11434';
    if (ollamaModelInput) ollamaModelInput.value = state.settings.ollamaModel || 'qwen2.5-coder:3b';
    if (ollamaEmbedInput) ollamaEmbedInput.value = state.settings.ollamaEmbed || 'nomic-embed-text';
    
    if (customUrlInput) customUrlInput.value = state.settings.customUrl || 'https://integrate.api.nvidia.com/v1';
    if (customKeyInput) customKeyInput.value = state.settings.customKey || '';
    if (customModelInput) customModelInput.value = state.settings.customModel || 'meta/llama-3.2-11b-vision-instruct';
    if (customEmbedInput) customEmbedInput.value = state.settings.customEmbed || 'nvidia/embed-qa-4';
    
    if (chunkSizeSlider) {
        chunkSizeSlider.value = state.settings.chunkSize;
        chunkSizeVal.textContent = state.settings.chunkSize;
    }
    if (chunkOverlapSlider) {
        chunkOverlapSlider.value = state.settings.chunkOverlap;
        chunkOverlapVal.textContent = state.settings.chunkOverlap;
    }
    
    if (topKSlider) {
        topKSlider.value = state.settings.topK;
        topKVal.textContent = state.settings.topK;
    }
    if (thresholdSlider) {
        thresholdSlider.value = state.settings.threshold;
        thresholdVal.textContent = Number(state.settings.threshold).toFixed(2);
    }
    if (systemPromptInput) systemPromptInput.value = state.settings.systemPrompt;
    if (webSearchToggle) webSearchToggle.checked = !!state.settings.webSearch;
    const hydeToggle = document.getElementById('hyde-toggle');
    if (hydeToggle) hydeToggle.checked = !!state.settings.hyde;
    if (workspacePathInput) workspacePathInput.value = state.settings.workspacePath || '';
    
    const retrievalStrategySelect = document.getElementById('retrieval-strategy');
    if (retrievalStrategySelect) retrievalStrategySelect.value = state.settings.retrievalStrategy || 'hybrid';
    
    applyAppearance(state.settings.theme || 'dark');
    
    // Configure workspace on load if path exists
    if (state.settings.workspacePath) {
        configureBackendWorkspace(state.settings.workspacePath);
    }
    
    if (state.settings.provider === 'ollama') {
        discoverOllamaModels(true);
    }
    
    updateHeaderDisplay();
    validateInputs();
}

function updateHeaderDisplay() {
    if (!currentModelDisplay) return;
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
    if (geminiKeyInput) state.settings.apiKey = geminiKeyInput.value.trim();
    if (geminiModelSelect) state.settings.geminiModel = geminiModelSelect.value;
    if (geminiEmbedSelect) state.settings.geminiEmbed = geminiEmbedSelect.value;
    
    if (openaiKeyInput) state.settings.openaiKey = openaiKeyInput.value.trim();
    if (openaiModelSelect) state.settings.openaiModel = openaiModelSelect.value;
    if (openaiEmbedSelect) state.settings.openaiEmbed = openaiEmbedSelect.value;
    
    if (claudeKeyInput) state.settings.claudeKey = claudeKeyInput.value.trim();
    if (claudeModelSelect) state.settings.claudeModel = claudeModelSelect.value;
    if (claudeEmbedProviderSelect) state.settings.claudeEmbedProvider = claudeEmbedProviderSelect.value;
    
    if (ollamaUrlInput) state.settings.ollamaUrl = ollamaUrlInput.value.trim();
    if (ollamaModelInput) state.settings.ollamaModel = ollamaModelInput.value.trim();
    if (ollamaEmbedInput) state.settings.ollamaEmbed = ollamaEmbedInput.value.trim();
    
    if (customUrlInput) state.settings.customUrl = customUrlInput.value.trim();
    if (customKeyInput) state.settings.customKey = customKeyInput.value.trim();
    if (customModelInput) state.settings.customModel = customModelInput.value.trim();
    if (customEmbedInput) state.settings.customEmbed = customEmbedInput.value.trim();
    
    if (chunkSizeSlider) state.settings.chunkSize = parseInt(chunkSizeSlider.value);
    if (chunkOverlapSlider) state.settings.chunkOverlap = parseInt(chunkOverlapSlider.value);
    if (topKSlider) state.settings.topK = parseInt(topKSlider.value);
    if (thresholdSlider) state.settings.threshold = parseFloat(thresholdSlider.value);
    if (systemPromptInput) state.settings.systemPrompt = systemPromptInput.value.trim();
    if (webSearchToggle) state.settings.webSearch = webSearchToggle.checked;
    const hydeToggleEl = document.getElementById('hyde-toggle');
    if (hydeToggleEl) state.settings.hyde = hydeToggleEl.checked;
    
    const retrievalStrategySelect = document.getElementById('retrieval-strategy');
    if (retrievalStrategySelect) state.settings.retrievalStrategy = retrievalStrategySelect.value;
    
    const themeModeSelect = document.getElementById('theme-mode-select');
    if (themeModeSelect) state.settings.theme = themeModeSelect.value;
    
    applyAppearance(state.settings.theme);
    
    const oldPath = state.settings.workspacePath;
    if (workspacePathInput) state.settings.workspacePath = workspacePathInput.value.trim();
    
    localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
    
    // Call configuration endpoint to set workspace root
    configureBackendWorkspace(state.settings.workspacePath, oldPath);
    
    const chatModelSelectElem = document.getElementById('chat-model-select');
    if (chatModelSelectElem) {
        chatModelSelectElem.value = state.settings.provider;
    }
    
    updateHeaderDisplay();
    validateInputs();
    closeDrawer(settingsDrawer);
    showToast("Configurations saved successfully!", "success");
}

// Drawer management
function openDrawer(drawer) {
    drawer.classList.add('open');
    if (drawer === settingsDrawer) {
        document.body.classList.add('settings-open');
    }
    requestAnimationFrame(() => {
        setTimeout(() => {
            const activeBtn = drawer.querySelector('.drawer-tab-btn.active');
            if (activeBtn && window.updateTabIndicator) {
                window.updateTabIndicator(activeBtn);
            }
        }, 60);
    });
}

function closeDrawer(drawer) {
    drawer.classList.remove('open');
    if (drawer === settingsDrawer) {
        document.body.classList.remove('settings-open');
    }
}

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => openDrawer(settingsDrawer));
}
settingsCloseBtn.addEventListener('click', () => closeDrawer(settingsDrawer));
drawerCloseBtn.addEventListener('click', () => closeDrawer(contextDrawer));
saveSettingsBtn.addEventListener('click', saveSettings);

// Close settings modal when clicking outside of it (backdrop click)
window.addEventListener('click', (e) => {
    if (document.body.classList.contains('settings-open')) {
        const settingsFooterBtn = document.getElementById('settings-footer-btn');
        if (settingsDrawer && !settingsDrawer.contains(e.target) && settingsFooterBtn && !settingsFooterBtn.contains(e.target)) {
            closeDrawer(settingsDrawer);
        }
    }
});

// Auto-discover and populate local Ollama models
async function discoverOllamaModels(silent = false) {
    const urlInput = document.getElementById('ollama-url');
    const url = urlInput ? (urlInput.value.trim() || 'http://localhost:11434') : 'http://localhost:11434';
    try {
        const resp = await fetch(`/api/ollama/discover?url=${encodeURIComponent(url)}`);
        const data = await resp.json();
        if (data.status === 'success' && Array.isArray(data.models) && data.models.length > 0) {
            const genDatalist = document.getElementById('ollama-generative-datalist');
            const embedDatalist = document.getElementById('ollama-embed-datalist');
            
            if (genDatalist) genDatalist.innerHTML = '';
            if (embedDatalist) embedDatalist.innerHTML = '';
            
            data.models.forEach(model => {
                if (genDatalist) {
                    const opt1 = document.createElement('option');
                    opt1.value = model;
                    genDatalist.appendChild(opt1);
                }
                if (embedDatalist) {
                    const opt2 = document.createElement('option');
                    opt2.value = model;
                    embedDatalist.appendChild(opt2);
                }
            });

            // Separate generative and embedding models
            const genModels = data.models.filter(m => !m.toLowerCase().includes('embed'));
            const embedModels = data.models.filter(m => m.toLowerCase().includes('embed'));

            // Auto-select valid model if current selection is invalid or stale default
            const currentGen = (state.settings.ollamaModel || '').trim();
            const isGenInstalled = data.models.some(m => m === currentGen || m.startsWith(currentGen + ':'));
            if ((!isGenInstalled || currentGen === 'llama3' || !currentGen) && genModels.length > 0) {
                state.settings.ollamaModel = genModels[0];
                if (ollamaModelInput) ollamaModelInput.value = genModels[0];
            }
            const currentEmbed = (state.settings.ollamaEmbed || '').trim();
            const isEmbedInstalled = data.models.some(m => m === currentEmbed || m.startsWith(currentEmbed + ':'));
            if ((!isEmbedInstalled || !currentEmbed) && embedModels.length > 0) {
                state.settings.ollamaEmbed = embedModels[0];
                if (ollamaEmbedInput) ollamaEmbedInput.value = embedModels[0];
            }

            if (!silent) {
                showToast(`Found ${data.models.length} local Ollama model(s): ${data.models.join(', ')}`, 'success');
            }
            return data.models;
        } else if (!silent) {
            showToast(`Scan failed: ${data.message || 'No models found'}`, 'error');
        }
    } catch (err) {
        if (!silent) {
            showToast(`Error scanning models: ${err.message}`, 'error');
        }
    }
    return [];
}

// Scan local Ollama models
const scanOllamaBtn = document.getElementById('scan-ollama-btn');
if (scanOllamaBtn) {
    scanOllamaBtn.addEventListener('click', async () => {
        scanOllamaBtn.disabled = true;
        scanOllamaBtn.textContent = 'Scanning...';
        try {
            await discoverOllamaModels(false);
        } finally {
            scanOllamaBtn.disabled = false;
            scanOllamaBtn.textContent = 'Scan';
        }
    });
}

// Auto-Discovery for Custom / OpenAI-Compatible (e.g. NVIDIA NIM) Models
async function discoverCustomModels(silent = false) {
    const urlInput = document.getElementById('custom-url');
    const keyInput = document.getElementById('custom-key');
    const url = urlInput ? (urlInput.value.trim() || 'https://integrate.api.nvidia.com/v1') : 'https://integrate.api.nvidia.com/v1';
    const key = keyInput ? keyInput.value.trim() : '';

    try {
        let endpoint = `/api/custom/discover?url=${encodeURIComponent(url)}`;
        if (key) endpoint += `&api_key=${encodeURIComponent(key)}`;
        const resp = await fetch(endpoint);
        const data = await resp.json();
        if (data.status === 'success' && Array.isArray(data.models) && data.models.length > 0) {
            const genDatalist = document.getElementById('custom-generative-datalist');
            const embedDatalist = document.getElementById('custom-embed-datalist');

            if (genDatalist) genDatalist.innerHTML = '';
            if (embedDatalist) embedDatalist.innerHTML = '';

            const genModels = [];
            const embedModels = [];

            data.models.forEach(model => {
                if (model.toLowerCase().includes('embed') || model.toLowerCase().includes('bge-')) {
                    embedModels.push(model);
                } else {
                    genModels.push(model);
                }
            });

            // Populate datalists
            (genModels.length > 0 ? genModels : data.models).forEach(m => {
                if (genDatalist) {
                    const opt = document.createElement('option');
                    opt.value = m;
                    genDatalist.appendChild(opt);
                }
            });
            (embedModels.length > 0 ? embedModels : data.models).forEach(m => {
                if (embedDatalist) {
                    const opt = document.createElement('option');
                    opt.value = m;
                    embedDatalist.appendChild(opt);
                }
            });

            // Auto-select valid active model if currently selected is decommissioned or empty
            const currentGen = (state.settings.customModel || '').trim();
            const isDecom = !currentGen || 
                currentGen.includes('llama-3.1') || 
                currentGen.includes('llama-3.3') || 
                currentGen.includes('nemotron-70b') || 
                !data.models.includes(currentGen);

            if (isDecom && genModels.length > 0) {
                const preferred = genModels.find(m => m.includes('llama-3.2-11b') || m.includes('llama-3.2-90b') || m.includes('gemma-4-31b')) || genModels[0];
                state.settings.customModel = preferred;
                if (customModelInput) customModelInput.value = preferred;
                try {
                    localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
                } catch(e) {}
            }

            if (!silent) {
                showToast(`Found ${data.models.length} custom/NVIDIA model(s)`, 'success');
            }
            return data.models;
        } else if (!silent) {
            showToast(`Scan failed: ${data.message || 'No models found'}`, 'error');
        }
    } catch (err) {
        if (!silent) {
            showToast(`Error scanning models: ${err.message}`, 'error');
        }
    }
    return [];
}

// Scan Custom models button listener
const scanCustomBtn = document.getElementById('scan-custom-btn');
if (scanCustomBtn) {
    scanCustomBtn.addEventListener('click', async () => {
        scanCustomBtn.disabled = true;
        scanCustomBtn.textContent = 'Scanning...';
        try {
            await discoverCustomModels(false);
        } finally {
            scanCustomBtn.disabled = false;
            scanCustomBtn.textContent = 'Scan';
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
        const chatModelSelectElem = document.getElementById('chat-model-select');
        if (chatModelSelectElem) {
            chatModelSelectElem.value = val;
        }
        if (val === 'ollama') {
            discoverOllamaModels(true);
        }
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
        
        let displayName = doc.name;
        if (doc.name.startsWith("YouTube: ")) {
            const badge = document.createElement('span');
            badge.className = 'doc-badge youtube';
            badge.textContent = 'YouTube';
            name.appendChild(badge);
            displayName = doc.name.replace("YouTube: ", "");
        } else if (doc.name.startsWith("Web: ")) {
            const badge = document.createElement('span');
            badge.className = 'doc-badge web';
            badge.textContent = 'Web';
            name.appendChild(badge);
            displayName = doc.name.replace("Web: ", "");
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = displayName;
        name.appendChild(titleSpan);
        
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
    
    updateQueryInputState();
    
    try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        const data = await res.json();
        state.messages = data.map(m => ({ role: m.role, content: m.content }));
        state.promptHistory = data.filter(m => m.role === 'user').map(m => m.content);
        state.promptHistoryIndex = -1;
        state.tempTypedPrompt = '';
        
        chatHistory.innerHTML = '';
        if (state.messages.length === 0) {
            renderWelcomeScreen();
        } else {
            state.messages.forEach(m => appendMessage(m.role, m.content));
        }
        
        // If there's an active stream running for this conversation, restore its UI!
        if (state.activeStreams[id]) {
            const stream = state.activeStreams[id];
            const assistantBubble = appendMessage('assistant', stream.assistantReply || 'Reflecting & gathering memory context...');
            stream.assistantContentDiv = assistantBubble.querySelector('.message-content');
            stream.assistantBubble = assistantBubble;
            if (stream.assistantReply) {
                stream.assistantContentDiv.innerHTML = parseMarkdown(stream.assistantReply);
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    } catch (err) {
        console.error(err);
    }
}

function updateQueryInputState() {
    const isGen = !!state.generatingConversations[state.activeConversationId];
    queryInput.disabled = isGen;
    sendBtn.disabled = isGen;
    if (isGen) {
        queryInput.placeholder = "Agent is responding...";
    } else {
        queryInput.placeholder = "Ask Nexus anything... (use /file to reference files, @ for documents)";
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

const consolidateMemoriesBtn = document.getElementById('consolidate-memories-btn');
if (consolidateMemoriesBtn) {
    consolidateMemoriesBtn.addEventListener('click', async () => {
        consolidateMemoriesBtn.disabled = true;
        consolidateMemoriesBtn.textContent = 'Consolidating...';
        showToast("Starting memory consolidation job...", "info");
        
        try {
            const embedConfig = getEmbeddingConfig();
            const activeProv = state.settings.provider;
            let genModel = 'gemini-1.5-flash';
            let apiKey = '';
            if (activeProv === 'gemini') {
                genModel = state.settings.geminiModel || 'gemini-1.5-flash';
                apiKey = state.settings.apiKey;
            } else if (activeProv === 'openai') {
                genModel = state.settings.openaiModel || 'gpt-4o';
                apiKey = state.settings.openaiKey;
            } else if (activeProv === 'claude') {
                genModel = state.settings.claudeModel || 'claude-3-5-sonnet-latest';
                apiKey = state.settings.claudeKey;
            } else if (activeProv === 'ollama') {
                genModel = state.settings.ollamaModel || 'llama3';
            } else if (activeProv === 'custom') {
                genModel = state.settings.customModel;
                apiKey = state.settings.customKey;
            }
            
            const res = await fetch('/api/memory/consolidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: activeProv,
                    apiKey: apiKey,
                    ollamaUrl: embedConfig.ollamaUrl,
                    embedModel: embedConfig.embedModel,
                    genModel: genModel
                })
            });
            
            if (res.ok) {
                showToast("Consolidation job running in background. Updating facts in 3 seconds...", "success");
                setTimeout(async () => {
                    await loadProfileMemories();
                    consolidateMemoriesBtn.disabled = false;
                    consolidateMemoriesBtn.textContent = 'Consolidate';
                }, 3000);
            } else {
                showToast("Failed to start consolidation job", "error");
                consolidateMemoriesBtn.disabled = false;
                consolidateMemoriesBtn.textContent = 'Consolidate';
            }
        } catch (err) {
            showToast("Consolidation error: " + err.message, "error");
            consolidateMemoriesBtn.disabled = false;
            consolidateMemoriesBtn.textContent = 'Consolidate';
        }
    });
}

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
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
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
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
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
    const chartBlocks = [];
    const mermaidBlocks = [];
    html = html.replace(/`{2,}([a-zA-Z0-9_\-.:]*)(?:[ \t]+([^\r\n]*))?[ \r]*\n([\s\S]*?)`{2,}/g, (match, lang, extra, code) => {
        let cleanLang = (lang || '').trim() || 'code';
        let rawCodeBody = code || '';
        if (extra && extra.trim()) {
            rawCodeBody = extra.trim() + '\n' + rawCodeBody;
        }

        const unescapedCode = rawCodeBody
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
        const trimmedCode = unescapedCode.trim();

        // Check for Mermaid diagram blocks
        const lowerLang = cleanLang.toLowerCase();
        const strippedMermaidHead = trimmedCode.replace(/^%%[^\n]*\n+/i, '').replace(/^`{3,}(?:mermaid)?\s*/i, '').trim();
        const isMermaidKeyword = /^(graph(\s+(TD|TB|BT|RL|LR))?|flowchart(\s+(TD|TB|BT|RL|LR))?|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|mindmap|gantt|pie(\s+title)?|gitGraph|quadrantChart|c4Context|requirementDiagram|subgraph\s+)/i.test(strippedMermaidHead);
        const isMermaid = lowerLang === 'mermaid' || lowerLang === 'mermaidjs' || lowerLang === 'mermaid.js' || lowerLang === 'diagram' || isMermaidKeyword;

        if (isMermaid) {
            const mermaidIdx = mermaidBlocks.length;
            const diagramId = 'nexus-diagram-' + Math.random().toString(36).substring(2, 9);
            
            let diagramTitle = 'Architecture Diagram';
            if (/^sequenceDiagram/i.test(trimmedCode)) diagramTitle = 'Sequence Diagram';
            else if (/^classDiagram/i.test(trimmedCode)) diagramTitle = 'Class Diagram';
            else if (/^stateDiagram/i.test(trimmedCode)) diagramTitle = 'State Diagram';
            else if (/^erDiagram/i.test(trimmedCode)) diagramTitle = 'Entity Relationship Diagram';
            else if (/^mindmap/i.test(trimmedCode)) diagramTitle = 'Mindmap Diagram';
            else if (/^gantt/i.test(trimmedCode)) diagramTitle = 'Gantt Project Timeline';
            else if (/^pie/i.test(trimmedCode)) diagramTitle = 'Pie Chart Diagram';
            else if (/^gitGraph/i.test(trimmedCode)) diagramTitle = 'Git Branch Flow';
            else if (/^(graph|flowchart)/i.test(trimmedCode)) diagramTitle = 'Process & Flowchart Diagram';

            const rawCodeEscaped = encodeURIComponent(trimmedCode);

            mermaidBlocks.push(`
            <div class="mermaid-wrapper" id="${diagramId}-card">
                <div class="mermaid-header">
                    <div class="mermaid-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        <span>${diagramTitle}</span>
                    </div>
                    <div class="mermaid-actions">
                        <button class="mermaid-action-btn" onclick="copyMermaidCode('${diagramId}')" title="Copy Mermaid Code">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Copy</span>
                        </button>
                        <button class="mermaid-action-btn" onclick="exportMermaidSvg('${diagramId}')" title="Export as Vector SVG">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>SVG</span>
                        </button>
                        <button class="mermaid-action-btn" onclick="exportMermaidPng('${diagramId}')" title="Export as High-Res PNG">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>PNG</span>
                        </button>
                    </div>
                </div>
                <div class="mermaid-render-pane" id="${diagramId}" data-code="${rawCodeEscaped}">
                    <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;color:var(--text-secondary);font-size:12px;">
                        <span>Rendering diagram...</span>
                    </div>
                </div>
            </div>`);
            return `\n\n__MERMAID_BLOCK_${mermaidIdx}__\n\n`;
        }

        let parsedSpec = null;
        try {
            parsedSpec = JSON.parse(trimmedCode);
        } catch(e) {
            const jsonMatch = trimmedCode.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedSpec = JSON.parse(jsonMatch[0]);
                } catch(e2) {
                    parsedSpec = null;
                }
            }
        }

        const isChartJson = !!(parsedSpec && parsedSpec.type && parsedSpec.data && parsedSpec.data.datasets && ['bar', 'line', 'pie', 'doughnut', 'radar', 'polararea'].includes(String(parsedSpec.type).toLowerCase()));

        // Check for Chart.js blocks
        const isChartLang = cleanLang.toLowerCase().includes('chart') || cleanLang.toLowerCase() === 'chartjs';
        if (isChartLang || isChartJson) {
            const chartIdx = chartBlocks.length;
            const chartId = 'nexus-chart-' + Math.random().toString(36).substring(2, 9);
            const chartTitle = (parsedSpec && parsedSpec.title) ? parsedSpec.title : 'Data Visualization';
            const chartType = (parsedSpec && parsedSpec.type) ? parsedSpec.type.toUpperCase() : 'CHART';
            const rawJsonEscaped = encodeURIComponent(parsedSpec ? JSON.stringify(parsedSpec) : unescapedCode.trim());
            
            chartBlocks.push(`
            <div class="nexus-chart-card" id="${chartId}-card">
                <div class="nexus-chart-header">
                    <div class="nexus-chart-meta">
                        <span class="nexus-chart-type-badge">${chartType}</span>
                        <span class="nexus-chart-title">${chartTitle}</span>
                    </div>
                    <div class="nexus-chart-actions">
                        <button class="chart-action-btn" onclick="toggleChartTable(this, '${chartId}')" title="Toggle Raw Data Table">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                            <span>Data</span>
                        </button>
                        <button class="chart-action-btn" onclick="exportChartPng('${chartId}', '${chartTitle}')" title="Export as High-Res PNG">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>PNG</span>
                        </button>
                    </div>
                </div>
                <div class="nexus-chart-body">
                    <canvas id="${chartId}" class="nexus-chart-canvas" data-chart-spec="${rawJsonEscaped}"></canvas>
                </div>
                <div class="nexus-chart-table-view" id="${chartId}-table"></div>
            </div>`);
            return `\n\n__CHART_BLOCK_${chartIdx}__\n\n`;
        }

        const blockIndex = codeBlocks.length;
        codeBlocks.push(`
        <div class="code-container">
            <div class="code-header">
                <span class="code-lang">${cleanLang}</span>
                <div class="code-actions">
                    ${(cleanLang.toLowerCase() === 'python' || cleanLang.toLowerCase() === 'py' || cleanLang.toLowerCase() === 'javascript' || cleanLang.toLowerCase() === 'js') ? 
                      `<button class="code-action-btn run-btn" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);" onclick="runCodeSandbox(this, '${cleanLang}')">Run</button>` : ''}
                    <button class="code-action-btn copy-btn" onclick="copyToClipboard(this)">Copy</button>
                    <button class="code-action-btn download-btn" onclick="downloadCode(this, '${cleanLang}')">Download</button>
                </div>
            </div>
            <pre class="language-${cleanLang}"><code class="language-${cleanLang}">${code.trim()}</code></pre>
            <div class="sandbox-output-pane" style="display: none; background: rgba(0, 0, 0, 0.45); border-top: 1px solid var(--border-color); padding: 12px; font-family: 'Space Mono', monospace; font-size: 11px; max-height: 200px; overflow-y: auto; text-align: left; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;"></div>
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
    
    // Step C2: Extract Markdown Images into clean block placeholders
    const images = [];
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, rawUrl) => {
        const cleanUrl = rawUrl.replace(/&amp;/g, '&');
        const imgIndex = images.length;
        const cleanName = (alt || 'image').replace(/[^a-zA-Z0-9_\-]/g, '_');
        images.push(`<div class="image-showcase-card">
            <div class="image-showcase-preview" onclick="openImageLightbox('${cleanUrl}')" title="Click to view full resolution">
                <img src="${cleanUrl}" alt="${alt}" class="image-showcase-img" loading="lazy">
            </div>
            <div class="image-showcase-footer">
                <div class="image-showcase-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span class="meta-title" title="${alt}">${alt || 'Generated Image'}</span>
                </div>
                <div class="image-showcase-btns">
                    <a href="${cleanUrl}" download="nexus_${cleanName}.jpg" class="showcase-btn download" title="Download High-Res Image">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Download</span>
                    </a>
                    <button type="button" class="showcase-btn save" onclick="saveImageToWorkspace('${cleanUrl}', '${alt}')" title="Save to Workspace">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span>Save</span>
                    </button>
                </div>
            </div>
        </div>`);
        return `\n\n__IMAGE_BLOCK_${imgIndex}__\n\n`;
    });

    // Step D: Inline formatting (done only on text segments)
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Step E: Split by double newlines into clean blocks
    const paragraphs = html.split(/\n\s*\n/);
    const renderedParagraphs = paragraphs.map(p => {
        let trimmed = p.trim();
        if (!trimmed) return '';
        
        // Restore Mermaid blocks if present
        if (trimmed.includes('__MERMAID_BLOCK_')) {
            trimmed = trimmed.replace(/__MERMAID_BLOCK_(\d+)__/g, (_, idx) => mermaidBlocks[parseInt(idx)] || '');
        }

        // Restore chart blocks if present
        if (trimmed.includes('__CHART_BLOCK_')) {
            trimmed = trimmed.replace(/__CHART_BLOCK_(\d+)__/g, (_, idx) => chartBlocks[parseInt(idx)] || '');
        }

        // Restore code blocks if present
        if (trimmed.includes('__CODE_BLOCK_')) {
            trimmed = trimmed.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[parseInt(idx)] || '');
        }
        
        // Restore table blocks if present
        if (trimmed.includes('__TABLE_BLOCK_')) {
            trimmed = trimmed.replace(/__TABLE_BLOCK_(\d+)__/g, (_, idx) => tables[parseInt(idx)] || '');
        }

        // Restore image blocks if present
        if (trimmed.includes('__IMAGE_BLOCK_')) {
            trimmed = trimmed.replace(/__IMAGE_BLOCK_(\d+)__/g, (_, idx) => images[parseInt(idx)] || '');
        }

        // If block is already a card/container div, return as-is
        if (trimmed.startsWith('<div class="mermaid-wrapper"') || trimmed.startsWith('<div class="nexus-chart-card"') || trimmed.startsWith('<div class="code-container"') || trimmed.startsWith('<div class="nexus-table-card"') || trimmed.startsWith('<div class="image-showcase-card"')) {
            return trimmed;
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
    if (content && content.includes('nexus-loading-container')) {
        msgContent.innerHTML = content;
    } else {
        msgContent.innerHTML = parseMarkdown(content);
    }
    bubble.appendChild(msgContent);
    
    if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
        Prism.highlightAllUnder(msgContent);
    }
    
    renderMath(msgContent);
    renderMermaidDiagrams(bubble);
    renderChartJsVisualizations(bubble);
    
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
    
    if (role === 'assistant') {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'message-speak-btn';
        speakBtn.title = "Read message aloud";
        speakBtn.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; opacity: 0.8; padding: 4px 10px; margin-top: 8px; font-size: 10px; display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px; transition: all 0.2s; font-family: inherit; font-weight: 500;";
        speakBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Speak`;
        speakBtn.addEventListener('click', () => {
            toggleSpeech(content, speakBtn);
        });
        bubble.appendChild(speakBtn);
    }
    
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return bubble;
}

queryInput.addEventListener('input', () => {
    validateInputs();
    updateTokenGauge();
});

async function retryLastMessage() {
    let lastUserMessageIdx = -1;
    for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === 'user') {
            lastUserMessageIdx = i;
            break;
        }
    }
    if (lastUserMessageIdx === -1) return;
    const lastQuery = state.messages[lastUserMessageIdx].content;
    state.messages.splice(lastUserMessageIdx, 1);
    
    // Remove last pair from DOM if needed, but it's cleaner to just append a new bubble
    queryInput.value = lastQuery;
    chatForm.dispatchEvent(new Event('submit'));
}
window.retryLastMessage = retryLastMessage;

// --- Chat Form Handler & Streaming API Integration ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if this conversation is already generating
    if (state.generatingConversations[state.activeConversationId]) {
        return;
    }
    
    const query = queryInput.value.trim();
    if (!query) return;
    
    // Check if query is an Image Generation request
    const qLower = query.toLowerCase().trim();
    const isImageQuery = ["generate an image", "generate image", "create an image", "create image", "draw an image", "draw a picture", "draw image", "make an image"].some(t => qLower.includes(t));

    // Synchronize active provider with inline model selector if present
    const inlineModelSelect = document.getElementById('chat-model-select');
    const activeProvider = (inlineModelSelect && inlineModelSelect.value) ? inlineModelSelect.value : (state.settings.provider || 'gemini');
    state.settings.provider = activeProvider;

    if (!isImageQuery && activeProvider === 'gemini' && !state.settings.apiKey.trim()) {
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
    if (activeProvider === 'custom') {
        if (!state.settings.customUrl.trim()) {
            showToast("Custom Base URL is required. Please set it in configurations.", "error");
            openDrawer(settingsDrawer);
            return;
        }
        if (!state.settings.customModel || !state.settings.customModel.trim()) {
            showToast("Custom Generative Model name is required. Please set it in configurations.", "error");
            openDrawer(settingsDrawer);
            return;
        }
    }
    
    let queryToSubmit = query;
    if (state.selectedAttachments && state.selectedAttachments.length > 0) {
        const fileTags = state.selectedAttachments.map(p => `/file ${p}`).join(' ');
        queryToSubmit = `${query}\n${fileTags}`;
        state.selectedAttachments = [];
        renderAttachmentChips();
    }
    
    // Save to prompt history
    if (!state.promptHistory.length || state.promptHistory[state.promptHistory.length - 1] !== query) {
        state.promptHistory.push(query);
    }
    state.promptHistoryIndex = -1;
    state.tempTypedPrompt = '';
    
    queryInput.value = '';
    validateInputs();
    updateTokenGauge();
    
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
    
    const convId = state.activeConversationId;
    state.generatingConversations[convId] = true;
    updateQueryInputState();
    
    state.messages.push({ role: 'user', content: queryToSubmit });
    appendMessage('user', query);
    
    const assistantBubble = appendMessage('assistant', '<div class="nexus-loading-container"><div class="nexus-loading-spinner"><div class="nexus-loading-circle"></div><div class="nexus-loading-inner"></div><div class="nexus-loading-core"></div></div><span class="nexus-loading-text">Nexus is reflecting...</span></div>');
    const assistantContentDiv = assistantBubble.querySelector('.message-content');
    
    // Initialize active stream tracking state
    state.activeStreams[convId] = {
        assistantReply: '',
        assistantContentDiv: assistantContentDiv,
        assistantBubble: assistantBubble,
        sources: []
    };
    
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
                conversationId: convId,
                apiKey: apiKey,
                ollamaUrl: ollamaUrl,
                genModel: genModel,
                embedModel: embedModel,
                topK: state.settings.topK,
                threshold: state.settings.threshold,
                systemPrompt: state.settings.systemPrompt,
                webSearch: !!state.settings.webSearch,
                hyde: !!state.settings.hyde,
                retrievalStrategy: state.settings.retrievalStrategy || 'hybrid',
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
                
                const stream = state.activeStreams[convId];
                if (!stream) break;
                
                if (trimmed.startsWith('event: ')) {
                    currentEvent = trimmed.substring(7);
                } else if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.substring(6);
                    if (currentEvent === 'sources') {
                        stream.sources = JSON.parse(dataStr);
                        if (convId === state.activeConversationId) {
                            state.currentSources = stream.sources;
                        }
                    } else if (currentEvent === 'warning') {
                        const warn = JSON.parse(dataStr);
                        showToast(warn.message, 'error');
                    
                    } else if (currentEvent === 'research_step') {
                        const rStep = JSON.parse(dataStr);
                        handleResearchStep(rStep, stream);
                    } else if (currentEvent === 'research_complete') {
                        handleResearchComplete(stream);
                    } else if (currentEvent === 'rag_eval') {
                        const evalData = JSON.parse(dataStr);
                        handleRagEval(evalData, stream);

                    } else if (currentEvent === 'agent_step') {
                        const step = JSON.parse(dataStr);
                        
                        // Append to the dedicated Subagent Execution Logger panel
                        if (window.appendAgentLog) {
                            window.appendAgentLog(step.agent, step.message);
                        }
                        
                        if (firstTextChunk) {
                            stream.assistantContentDiv.innerHTML = '';
                            firstTextChunk = false;
                        }
                        const stepDiv = document.createElement('div');
                        stepDiv.className = 'agent-step-log';
                        stepDiv.style.margin = '8px 0';
                        stepDiv.style.padding = '8px 14px';
                        stepDiv.style.borderLeft = '3px solid var(--cyan-color)';
                        stepDiv.style.fontSize = '12px';
                        stepDiv.style.fontWeight = '600';
                        stepDiv.style.background = 'var(--bg-card)';
                        stepDiv.style.color = 'var(--text-primary)';
                        stepDiv.style.borderRadius = '8px';
                        stepDiv.innerHTML = `&raquo; [${step.agent.toUpperCase()}] &nbsp;${step.message}`;
                        
                        if (convId === state.activeConversationId) {
                            stream.assistantContentDiv.appendChild(stepDiv);
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                        }
                    } else if (currentEvent === 'text') {
                        const text = JSON.parse(dataStr);
                        if (firstTextChunk) {
                            stream.assistantContentDiv.innerHTML = '';
                            firstTextChunk = false;
                        }
                        stream.assistantReply += text;
                        
                        if (convId === state.activeConversationId) {
                            stream.assistantContentDiv.innerHTML = parseMarkdown(stream.assistantReply);
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                        }
                    } else if (currentEvent === 'error') {
                        const err = JSON.parse(dataStr);
                        if (convId === state.activeConversationId) {
                            stream.assistantContentDiv.innerHTML = `
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <span style="color: var(--red-alert); font-weight: 500;">Error: ${err}</span>
                                    <button class="retry-btn" onclick="retryLastMessage()" style="align-self: flex-start; background: var(--accent-color); color: white; border: none; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; margin-top: 4px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                        Retry
                                    </button>
                                </div>
                            `;
                        }
                    }
                }
            }
        }
        
        const stream = state.activeStreams[convId];
        if (stream) {
            if (convId === state.activeConversationId) {
                if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
                    Prism.highlightAllUnder(stream.assistantContentDiv);
                }
                renderMath(stream.assistantContentDiv);
                renderMermaidDiagrams(stream.assistantBubble);
    renderChartJsVisualizations(stream.assistantBubble);
                state.messages.push({ role: 'assistant', content: stream.assistantReply });
            }
            
            if (stream.sources && stream.sources.length > 0) {
                const sourcesContainer = document.createElement('div');
                sourcesContainer.className = 'sources-container';
                
                stream.sources.forEach((src, idx) => {
                    const badge = document.createElement('span');
                    badge.className = 'source-badge';
                    badge.textContent = `[${idx + 1}] ${src.doc_name}`;
                    badge.addEventListener('click', () => {
                        showCitationsInDrawer(stream.sources, idx + 1);
                    });
                    sourcesContainer.appendChild(badge);
                });
                
                if (convId === state.activeConversationId) {
                    stream.assistantBubble.appendChild(sourcesContainer);
                }
            }
        }
        
        setTimeout(async () => {
            await loadProfileMemories();
            await loadSkills();
        }, 1500);
        
    } catch (err) {
        console.error(err);
        const stream = state.activeStreams[convId];
        if (stream && convId === state.activeConversationId) {
            stream.assistantContentDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span style="color: var(--red-alert); font-weight: 500;">Error: ${err.message || err}</span>
                    <button class="retry-btn" onclick="retryLastMessage()" style="align-self: flex-start; background: var(--accent-color); color: white; border: none; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; margin-top: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        Retry
                    </button>
                </div>
            `;
        }
    } finally {
        delete state.generatingConversations[convId];
        delete state.activeStreams[convId];
        updateQueryInputState();
    }
});

function initSplashCanvas() {
    const canvas = document.getElementById('splash-canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const handleResize = () => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    const particles = [];
    const maxParticles = 60;
    
    for (let i = 0; i < maxParticles; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2 + 1
        });
    }
    
    let active = true;
    
    function animateParticles() {
        if (!active) return;
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.08)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < maxParticles; i++) {
            const p1 = particles[i];
            for (let j = i + 1; j < maxParticles; j++) {
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        for (let i = 0; i < maxParticles; i++) {
            const p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        }
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
    
    return () => {
        active = false;
        window.removeEventListener('resize', handleResize);
    };
}

let introSoundPlayed = false;
const INTRO_AUDIO_URI = "data:audio/wav;base64,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";
const introAudio = new Audio(INTRO_AUDIO_URI);

function playIntroSound() {
    if (introSoundPlayed) return;
    try {
        introAudio.currentTime = 0;
        introAudio.play().then(() => {
            introSoundPlayed = true;
        }).catch(() => {
            // Autoplay blocked by browser
        });
    } catch (e) {}
}

function forcePlayIntroSound() {
    if (introSoundPlayed) return;
    try {
        introAudio.currentTime = 0;
        introAudio.play().then(() => {
            introSoundPlayed = true;
            window.removeEventListener('click', forcePlayIntroSound);
            window.removeEventListener('keydown', forcePlayIntroSound);
        }).catch(() => {});
    } catch (e) {}
}

window.addEventListener('click', forcePlayIntroSound, { once: true });
window.addEventListener('keydown', forcePlayIntroSound, { once: true });

let splashCanvasStopped = null;
function startSplashLoader() {
    const splash = document.getElementById('nexus-splash-screen');
    const container = document.querySelector('.nexus-splash-svg-container');
    const laserBeam = document.getElementById('laser-beam');
    const pattern = document.getElementById('code-pattern');
    if (!splash || !container) return;
    
    // Play intro boot-up synthesizer chime
    playIntroSound();
    
    if (!splashCanvasStopped) {
        splashCanvasStopped = initSplashCanvas();
    }
    document.body.style.overflow = "hidden";
    
    let startTime = Date.now();
    const duration = 2500; // 2.5 seconds
    let animationFrame;
    
    // Scrambled code characters array for dynamic mutation
    const scramblePool = "0101010101abcdefghijklmnopqrstuvwxyz[]{}<>:;+=-_*&^%$#@!";
    
    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        const easeT = 1 - Math.pow(1 - t, 3);
        const progress = Math.min(easeT * 100, 100);
        
        // Update CSS variable --laser-pos for clip paths (sweeping left to right)
        container.style.setProperty('--laser-pos', `${progress}%`);
        
        // Animate code pattern scrolling inside text shape
        if (pattern) {
            const scrollOffset = (Date.now() / 15) % 120;
            pattern.setAttribute('patternTransform', `translate(0, -${scrollOffset})`);
            
            // Randomly mutate characters inside pattern text elements
            if (t < 0.95 && Math.random() < 0.3) {
                const texts = pattern.querySelectorAll('text');
                texts.forEach(textNode => {
                    let chars = textNode.textContent.split('');
                    for (let i = 0; i < 2; i++) {
                        const idx = Math.floor(Math.random() * chars.length);
                        if (chars[idx] !== ' ') {
                            chars[idx] = scramblePool[Math.floor(Math.random() * scramblePool.length)];
                        }
                    }
                    textNode.textContent = chars.join('');
                });
            }
        }
        
        if (t < 1) {
            animationFrame = requestAnimationFrame(updateProgress);
        } else {
            if (laserBeam) {
                laserBeam.style.opacity = '0';
                laserBeam.style.transition = 'opacity 0.2s';
            }
            setTimeout(() => {
                splash.classList.add('zooming');
                setTimeout(() => {
                    splash.style.display = 'none';
                    splash.remove();
                    if (splashCanvasStopped) splashCanvasStopped();
                    document.body.style.overflow = "auto";
                }, 1200);
            }, 300);
        }
    }
    
    animationFrame = requestAnimationFrame(updateProgress);
}

// App Startup Initializations
window.addEventListener('DOMContentLoaded', async () => {
    // Apply theme classes to body early to ensure splash compliance
    const savedSettings = localStorage.getItem('symphony_rag_settings');
    let initialTheme = 'dark';
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            if (parsed.theme) initialTheme = parsed.theme;
        } catch (e) {}
    }
    document.body.classList.remove('theme-light', 'theme-dark', 'dark-theme');
    if (initialTheme === 'dark') {
        document.body.classList.add('theme-dark', 'dark-theme');
    } else {
        document.body.classList.add('theme-light');
    }

    startSplashLoader();
    initSettings();
    await loadDocuments();
    await loadConversations();
    await loadProfileMemories();
    await loadSkills();
    
    // Antigravity initializers
    renderProjectsList();
    const chatModelSelect = document.getElementById('chat-model-select');
    if (chatModelSelect) {
        chatModelSelect.value = state.settings.provider;
    }
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportConversation());
    }
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = (state.settings.theme === 'dark') ? 'light' : 'dark';
            applyAppearance(nextTheme);
            localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
        });
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

window.saveToWorkspaceBlock = async function(button, lang) {
    if (!state.settings.workspacePath) {
        showToast("No active project workspace folder configured.", "error");
        return;
    }
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('pre code');
    const rawCode = codeElement.innerText;
    
    const extMap = {
        'python': 'py', 'py': 'py', 'javascript': 'js', 'js': 'js',
        'typescript': 'ts', 'ts': 'ts', 'html': 'html', 'css': 'css',
        'json': 'json', 'bash': 'sh', 'sh': 'sh', 'cpp': 'cpp', 'c': 'c',
        'rust': 'rs', 'rs': 'rs', 'go': 'go', 'java': 'java', 'sql': 'sql',
        'yaml': 'yaml', 'yml': 'yaml', 'markdown': 'md', 'md': 'md'
    };
    const ext = extMap[lang.toLowerCase()] || 'txt';
    const defaultName = `snippet_${Date.now()}.${ext}`;
    
    const targetPath = await showPrompt("Save Code Snippet to Workspace Folder", defaultName);
    if (!targetPath) return;
    
    button.disabled = true;
    button.textContent = 'Comparing...';
    
    try {
        let oldContent = "";
        try {
            const checkResp = await fetch(`/api/workspace/file?path=${encodeURIComponent(targetPath)}`);
            if (checkResp.ok) {
                const checkData = await checkResp.json();
                if (checkData.status === 'success') {
                    oldContent = checkData.content || "";
                }
            }
        } catch (e) {
            console.log("Treating as new file.", e);
        }
        
        if (oldContent && oldContent.trim() !== "") {
            button.textContent = 'Reviewing...';
            const confirmed = await showDiffModal(oldContent, rawCode);
            if (!confirmed) {
                showToast("Save cancelled.", "info");
                button.textContent = 'Save to WS';
                return;
            }
        }
        
        button.textContent = 'Saving...';
        const resp = await fetch('/api/workspace/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: targetPath,
                content: rawCode
            })
        });
        const data = await resp.json();
        if (data.status === 'success') {
            showToast(`File saved to workspace: ${targetPath}`, "success");
            loadWorkspaceFiles();
            button.textContent = 'Saved!';
        } else {
            showToast(data.detail || "Could not save file", "error");
            button.textContent = 'Save to WS';
        }
    } catch (err) {
        showToast("Error saving file: " + err.message, "error");
        button.textContent = 'Save to WS';
    } finally {
        button.disabled = false;
        setTimeout(() => {
            button.textContent = 'Save to WS';
        }, 2500);
    }
};

// Appearance & Design System Helper
function applyAppearance(themeName) {
    state.settings.theme = themeName || 'dark';
    
    document.body.classList.remove('theme-light', 'light-theme', 'theme-dark', 'dark-theme');
    
    const themeBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = themeBtn ? themeBtn.querySelector('.theme-icon-sun') : null;
    const moonIcon = themeBtn ? themeBtn.querySelector('.theme-icon-moon') : null;
    
    if (state.settings.theme === 'dark') {
        document.body.classList.add('theme-dark', 'dark-theme');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        document.body.classList.add('theme-light', 'light-theme');
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }

    // Adapt active charts and diagrams to the new theme
    setTimeout(() => {
        if (window.Chart) {
            document.querySelectorAll('.nexus-chart-canvas').forEach(canvas => {
                canvas.dataset.rendered = 'false';
                const existing = Chart.getChart(canvas);
                if (existing) existing.destroy();
            });
            renderChartJsVisualizations(document);
        }
        if (window.mermaid) {
            initMermaidEngine();
            document.querySelectorAll('.mermaid-render-pane').forEach(pane => {
                pane.dataset.rendered = 'false';
            });
            renderMermaidDiagrams(document);
        }
    }, 50);
}

function renderAttachmentChips() {
    const container = document.getElementById('attachment-container');
    if (!container) return;
    container.innerHTML = '';
    if (state.selectedAttachments.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    state.selectedAttachments.forEach(filePath => {
        const parts = filePath.split(/[\\/]/);
        const name = parts[parts.length - 1] || filePath;
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>${name}</span>
            <span class="chip-remove" title="Remove attachment">&times;</span>
        `;
        chip.querySelector('.chip-remove').addEventListener('click', () => {
            removeAttachmentChip(filePath);
        });
        container.appendChild(chip);
    });
    updateTokenGauge();
}

function addAttachmentChip(filePath) {
    if (!state.selectedAttachments.includes(filePath)) {
        state.selectedAttachments.push(filePath);
        renderAttachmentChips();
    }
}

function removeAttachmentChip(filePath) {
    state.selectedAttachments = state.selectedAttachments.filter(p => p !== filePath);
    renderAttachmentChips();
}

function updateTokenGauge() {
    const fill = document.getElementById('token-gauge-fill');
    const text = document.getElementById('token-gauge-text');
    if (!fill || !text) return;
    
    let totalChars = 0;
    if (queryInput) totalChars += queryInput.value.length;
    
    if (state.messages) {
        state.messages.forEach(m => {
            totalChars += (m.content || '').length;
        });
    }
    
    if (state.selectedAttachments && state.workspaceFiles) {
        state.selectedAttachments.forEach(att => {
            const fileObj = state.workspaceFiles.find(f => f.path === att);
            if (fileObj) totalChars += fileObj.size || 0;
        });
    }
    
    const estTokens = Math.round(totalChars / 4);
    const maxTokens = 128000;
    const pct = Math.min(100, Math.round((estTokens / maxTokens) * 100));
    
    fill.style.width = `${pct}%`;
    text.textContent = `Context Tokens: ${estTokens.toLocaleString()} / ${(maxTokens / 1000).toFixed(0)}K (${pct}%)`;
}

function exportConversation() {
    if (!state.activeConversationId || state.messages.length === 0) {
        showToast("No active conversation to export.", "info");
        return;
    }
    
    showConfirm("Export Chat", "Are you sure you want to export this conversation history to Markdown?", () => {
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
    });
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


// Deep Research Mode toggle button
const deepResearchBtn = document.getElementById('deep-research-btn');
if (deepResearchBtn) {
    deepResearchBtn.addEventListener('click', () => {
        deepResearchBtn.classList.toggle('active');
        const isActive = deepResearchBtn.classList.contains('active');
        state.deepResearch = isActive;
        showToast(isActive ? "Deep Research Mode enabled: Autonomous multi-source web intelligence" : "Deep Research Mode disabled", "info");
    });
}

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
        if (autocompleteDropdown && autocompleteDropdown.style.display !== 'none') {
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
            return;
        }
        
        // Prompt History Navigation via ArrowUp / ArrowDown
        if (e.key === 'ArrowUp') {
            if (!state.promptHistory || state.promptHistory.length === 0) {
                if (state.messages && state.messages.length > 0) {
                    state.promptHistory = state.messages.filter(m => m.role === 'user').map(m => m.content);
                }
            }
            if (!state.promptHistory || state.promptHistory.length === 0) return;
            e.preventDefault();
            if (state.promptHistoryIndex === -1) {
                state.tempTypedPrompt = queryInput.value;
                state.promptHistoryIndex = state.promptHistory.length - 1;
            } else if (state.promptHistoryIndex > 0) {
                state.promptHistoryIndex--;
            }
            queryInput.value = state.promptHistory[state.promptHistoryIndex];
            validateInputs();
            setTimeout(() => queryInput.setSelectionRange(queryInput.value.length, queryInput.value.length), 0);
        } else if (e.key === 'ArrowDown') {
            if (state.promptHistoryIndex >= 0) {
                e.preventDefault();
                state.promptHistoryIndex++;
                if (state.promptHistoryIndex >= state.promptHistory.length) {
                    state.promptHistoryIndex = -1;
                    queryInput.value = state.tempTypedPrompt || '';
                } else {
                    queryInput.value = state.promptHistory[state.promptHistoryIndex];
                }
                validateInputs();
                setTimeout(() => queryInput.setSelectionRange(queryInput.value.length, queryInput.value.length), 0);
            }
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
        if (query.startsWith('file ') || query.startsWith('files ') || query === 'file' || query === 'files') {
            let fileQuery = '';
            if (query.startsWith('file ')) fileQuery = query.substring(5);
            else if (query.startsWith('files ')) fileQuery = query.substring(6);
            
            const filesHistory = state.workspaceFiles || [];
            filteredItems = filesHistory.filter(f => f.path.toLowerCase().includes(fileQuery) || f.name.toLowerCase().includes(fileQuery)).map(f => ({
                name: f.path,
                type: 'file',
                value: f.path
            }));
        } else if (query.startsWith('skills ') || query === 'skills') {
            let skillQuery = '';
            if (query.startsWith('skills ')) skillQuery = query.substring(7);
            filteredItems = state.skills.filter(s => s.name.toLowerCase().includes(skillQuery)).map(s => ({
                name: s.name,
                type: 'skill',
                value: s.name + ': ' + s.description
            }));
        } else {
            const commands = [
                { name: '/file', type: 'cmd', desc: 'Attach workspace file', value: '/file' },
                { name: '/web', type: 'cmd', desc: 'Force web search retrieval', value: '/web' },
                { name: '/memo', type: 'cmd', desc: 'Reference memory fact', value: '/memo' },
                { name: '/skills', type: 'cmd', desc: 'Browse learned skills', value: '/skills' },
                { name: '/agent', type: 'cmd', desc: 'Toggle agent execution mode', value: '/agent' }
            ];
            filteredItems = commands.filter(c => c.name.toLowerCase().includes('/' + query));
            
            if (filteredItems.length === 0) {
                filteredItems = state.skills.filter(s => s.name.toLowerCase().includes(query)).map(s => ({
                    name: s.name,
                    type: 'skill',
                    value: s.name + ': ' + s.description
                }));
            }
        }
    } else if (char === '@') {
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
        const descText = item.desc ? `<small style="color: var(--text-secondary); margin-left: 8px; font-weight: normal;">${item.desc}</small>` : '';
        div.innerHTML = `
            <span class="item-type">${item.type}</span>
            <span class="item-name">${item.name} ${descText}</span>
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
    if (item.type === 'file') {
        const text = queryInput.value;
        const beforeTrigger = text.slice(0, triggerIndex);
        const afterCursor = text.slice(queryInput.selectionStart);
        queryInput.value = (beforeTrigger + afterCursor).trim();
        addAttachmentChip(item.name);
        hideAutocomplete();
        validateInputs();
        queryInput.focus();
        return;
    }
    
    const text = queryInput.value;
    const cursorPosition = queryInput.selectionStart;
    const beforeTrigger = text.slice(0, triggerIndex);
    const afterCursor = text.slice(cursorPosition);
    
    if (item.type === 'cmd') {
        if (item.name === '/file') {
            queryInput.value = beforeTrigger + '/file ' + afterCursor;
            const newPos = triggerIndex + 6;
            queryInput.setSelectionRange(newPos, newPos);
            showAutocomplete('/', 'file ');
        } else if (item.name === '/skills') {
            queryInput.value = beforeTrigger + '/skills ' + afterCursor;
            const newPos = triggerIndex + 8;
            queryInput.setSelectionRange(newPos, newPos);
            showAutocomplete('/', 'skills ');
        } else if (item.name === '/web') {
            const strategySelect = document.getElementById('retrieval-strategy-select') || document.querySelector('[name="strategy"]');
            if (strategySelect) {
                strategySelect.value = 'web';
                strategySelect.dispatchEvent(new Event('change'));
            }
            queryInput.value = beforeTrigger + afterCursor;
            showToast("Search strategy set to Web Search", "success");
            hideAutocomplete();
        } else if (item.name === '/agent') {
            if (agentToggleBtn) {
                agentToggleBtn.click();
            }
            queryInput.value = beforeTrigger + afterCursor;
            hideAutocomplete();
        } else {
            queryInput.value = beforeTrigger + item.name + ' ' + afterCursor;
            const newCursorPos = triggerIndex + item.name.length + 1;
            queryInput.setSelectionRange(newCursorPos, newCursorPos);
            hideAutocomplete();
        }
        validateInputs();
        queryInput.focus();
        return;
    }
    
    const insertion = triggerChar + item.name;
    queryInput.value = beforeTrigger + insertion + ' ' + afterCursor;
    
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
        const previewPane = document.getElementById('preview-pane');
        previewPane.style.display = 'none';
        delete previewPane.dataset.currentDocId;
        delete previewPane.dataset.currentWorkspaceFilePath;
        if (previewSaveBtn) {
            previewSaveBtn.style.display = 'none';
        }
    });
}

// --- Local Workspace Explorer Logic ---
async function configureBackendWorkspace(path, oldPath = null) {
    if (!path) {
        renderProjectsList();
        try {
            await fetch('/api/workspace/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    path: "",
                    old_path: oldPath || ""
                })
            });
            await loadDocuments(); // Reload Catalogue to remove purged files from UI
        } catch (e) {
            console.error("Failed to notify backend of cleared workspace", e);
        }
        return;
    }
    
    // Resolve credentials for background sync
    const activeProvider = state.settings.provider;
    let apiKey = '';
    let ollamaUrl = '';
    let embedModel = '';
    
    if (activeProvider === 'gemini') {
        apiKey = state.settings.apiKey;
        embedModel = state.settings.geminiEmbed;
    } else if (activeProvider === 'openai') {
        apiKey = state.settings.openaiKey;
        embedModel = state.settings.openaiEmbed;
    } else if (activeProvider === 'ollama') {
        ollamaUrl = state.settings.ollamaUrl;
        embedModel = state.settings.ollamaEmbed;
    } else if (activeProvider === 'custom') {
        apiKey = state.settings.customKey;
        ollamaUrl = state.settings.customUrl;
        embedModel = state.settings.customEmbed;
    }
    
    try {
        const resp = await fetch('/api/workspace/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: path,
                provider: activeProvider,
                apiKey: apiKey,
                ollamaUrl: ollamaUrl,
                embedModel: embedModel
            })
        });
        
        const data = await resp.json();
        if (data.status === 'success') {
            if (path && !state.settings.workspaceHistory.includes(path)) {
                state.settings.workspaceHistory.push(path);
                localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
            }
            renderProjectsList();
            
            if (path) {
                const parts = path.split(/[\\/]/);
                const folderName = parts[parts.length - 1] || path;
                activateWorkspaceChat(folderName);
            }
        } else {
            showToast(data.detail || "Could not set workspace directory", "error");
        }
    } catch (err) {
        console.error("Config workspace error", err);
    }
}

async function activateWorkspaceChat(folderName) {
    const titleToFind = `Workspace: ${folderName}`;
    const existing = state.conversations.find(c => c.title === titleToFind);
    if (existing) {
        activateConversation(existing.id, existing.title);
    } else {
        try {
            const resp = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: titleToFind })
            });
            const data = await resp.json();
            if (data.id) {
                state.conversations.unshift(data);
                renderConversationsList();
                activateConversation(data.id, data.title);
            }
        } catch (err) {
            console.error("Failed to create workspace conversation", err);
        }
    }
}

async function loadWorkspaceFiles() {
    if (!state.settings.workspacePath) {
        state.workspaceFiles = [];
        return;
    }
    
    try {
        const resp = await fetch('/api/workspace/files');
        const data = await resp.json();
        if (data.status === 'success') {
            state.workspaceFiles = data.files || [];
        }
    } catch (err) {
        console.error("Could not load workspace files", err);
        state.workspaceFiles = [];
    }
}

async function openWorkspaceFilePreview(filePath) {
    const previewPane = document.getElementById('preview-pane');
    const titleEl = document.getElementById('preview-doc-title');
    const bodyEl = document.getElementById('preview-body');
    
    if (!previewPane || !titleEl || !bodyEl) return;
    
    titleEl.textContent = filePath.split('/').pop() + ' (Workspace)';
    previewPane.style.display = 'flex';
    previewPane.dataset.currentWorkspaceFilePath = filePath;
    
    if (previewSaveBtn) {
        previewSaveBtn.style.display = 'block';
    }
    
    bodyEl.innerHTML = '<div style="text-align:center; padding:20px;">Loading file contents...</div>';
    
    try {
        const resp = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
        const data = await resp.json();
        if (data.status === 'success') {
            bodyEl.innerHTML = `
                <textarea id="workspace-file-editor" style="width: 100%; height: calc(100vh - 180px); border: none; outline: none; padding: 12px; font-family: 'Space Mono', monospace; font-size: 12.5px; line-height: 1.5; background: var(--bg-card); color: var(--text-primary); resize: none; border-radius: 4px; box-sizing: border-box; border: 1px solid #000; box-shadow: var(--neo-shadow-sm);">${escapeHtml(data.content)}</textarea>
            `;
        } else {
            bodyEl.innerHTML = `<div style="color:var(--red-alert); padding:20px;">Failed to load file: ${data.message}</div>`;
        }
    } catch (err) {
        bodyEl.innerHTML = `<div style="color:var(--red-alert); padding:20px;">Connection failed: ${err.message}</div>`;
    }
}

// Bind save workspace file changes button
if (previewSaveBtn) {
    previewSaveBtn.addEventListener('click', async () => {
        const previewPane = document.getElementById('preview-pane');
        const filePath = previewPane.dataset.currentWorkspaceFilePath;
        const editor = document.getElementById('workspace-file-editor');
        
        if (!filePath || !editor) return;
        
        previewSaveBtn.disabled = true;
        previewSaveBtn.textContent = 'Saving...';
        
        try {
            const resp = await fetch('/api/workspace/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: filePath,
                    content: editor.value
                })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                showToast("Workspace file changes saved successfully!", "success");
                loadWorkspaceFiles();
            } else {
                showToast(data.detail || "Could not save file changes", "error");
            }
        } catch (err) {
            showToast("Failed to connect to server: " + err.message, "error");
        } finally {
            previewSaveBtn.disabled = false;
            previewSaveBtn.textContent = 'Save Changes';
        }
    });
}

// --- Projects Render & Sidebar Workspace Manager ---
function renderProjectsList() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    
    projectList.innerHTML = '';
    const history = state.settings.workspaceHistory || [];
    
    if (history.length === 0) {
        projectList.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:10px; font-size:12px; font-weight:700;">No active workspace. Click + to set folder.</li>';
        return;
    }
    
    history.forEach(path => {
        const parts = path.split(/[\\/]/);
        const folderName = parts[parts.length - 1] || path;
        const isActive = (state.settings.workspacePath === path);
        
        const li = document.createElement('li');
        li.className = `project-card ${isActive ? 'active' : ''}`;
        
        const info = document.createElement('div');
        info.className = 'project-card-info';
        info.innerHTML = `
            <span class="project-card-title">${folderName}</span>
            <span class="project-card-meta">${path}</span>
        `;
        li.appendChild(info);
        
        // Add a delete/clear button to the project card
        const delBtn = document.createElement('button');
        delBtn.className = 'project-card-delete';
        delBtn.innerHTML = '×';
        delBtn.title = isActive ? "Clear Active Workspace" : "Remove from History";
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isActive) {
                showConfirm("Remove Project", "Are you sure you want to clear this workspace project and purge its RAG database documents?", async () => {
                    const oldPath = state.settings.workspacePath;
                    state.settings.workspacePath = "";
                    if (workspacePathInput) workspacePathInput.value = "";
                    localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
                    await configureBackendWorkspace("", oldPath);
                    showToast("Workspace project deactivated.", "success");
                });
            } else {
                showConfirm("Remove History Entry", "Remove this folder from your workspace projects list?", () => {
                    state.settings.workspaceHistory = state.settings.workspaceHistory.filter(p => p !== path);
                    localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
                    renderProjectsList();
                    showToast("Workspace folder removed from history.", "success");
                });
            }
        });
        li.appendChild(delBtn);
        
        if (isActive) {
            li.addEventListener('click', () => {
                loadWorkspaceFiles();
            });
        } else {
            li.addEventListener('click', async () => {
                const oldPath = state.settings.workspacePath;
                state.settings.workspacePath = path;
                localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
                await configureBackendWorkspace(path, oldPath);
                showToast(`Switched active project to ${folderName}`, "success");
            });
        }
        
        projectList.appendChild(li);
    });
    
    if (state.settings.workspacePath) {
        // Auto-load files nested inside the active project card
        loadWorkspaceFiles();
    }
}

// Add project button trigger
const addProjectBtn = document.getElementById('sidebar-add-project-btn');
if (addProjectBtn) {
    addProjectBtn.addEventListener('click', async () => {
        showToast("Opening folder selector...", "info");
        try {
            const resp = await fetch('/api/workspace/select-folder', { method: 'POST' });
            const data = await resp.json();
            if (data.status === 'success' && data.path) {
                const path = data.path;
                const oldPath = state.settings.workspacePath;
                state.settings.workspacePath = path;
                if (workspacePathInput) workspacePathInput.value = path;
                localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
                await configureBackendWorkspace(state.settings.workspacePath, oldPath);
                showToast(`Workspace project configured: ${path}`, "success");
            } else {
                showToast("Folder selection cancelled.", "info");
            }
        } catch (err) {
            showToast("Failed to open folder picker: " + err.message, "error");
        }
    });
}

// Bind Settings Drawer tab buttons switching & sliding pill animation
const drawerTabBtns = document.querySelectorAll('.drawer-tab-btn');
const settingsTabPanes = document.querySelectorAll('.settings-tab-pane');
const tabIndicator = document.getElementById('drawer-tab-indicator');

function updateTabIndicator(activeBtn) {
    if (!activeBtn) return;
    const parent = activeBtn.closest('.drawer-tabs');
    if (!parent) return;
    const indicator = parent.querySelector('.drawer-tab-indicator');
    if (!indicator) return;
    const w = activeBtn.offsetWidth || activeBtn.getBoundingClientRect().width;
    const l = activeBtn.offsetLeft;
    if (w > 0) {
        indicator.style.width = `${w}px`;
        indicator.style.transform = `translateX(${l}px)`;
        indicator.style.opacity = '1';
    }
}

window.updateTabIndicator = updateTabIndicator;

drawerTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        drawerTabBtns.forEach(b => b.classList.remove('active'));
        settingsTabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-settings-tab');
        const targetPane = document.getElementById(tabId);
        if (targetPane) targetPane.classList.add('active');
        updateTabIndicator(btn);
    });
});

// Settings footer button trigger
const settingsFooterBtn = document.getElementById('settings-footer-btn');
if (settingsFooterBtn) {
    settingsFooterBtn.addEventListener('click', () => {
        openDrawer(settingsDrawer);
    });
}

// Inline model selector in chat input bar
const chatModelSelect = document.getElementById('chat-model-select');
if (chatModelSelect) {
    chatModelSelect.value = state.settings.provider;
    chatModelSelect.addEventListener('change', (e) => {
        const prov = e.target.value;
        state.settings.provider = prov;
        
        // Sync configurations panel checkboxes/radios
        document.querySelectorAll('input[name="provider"]').forEach(radio => {
            radio.checked = (radio.value === prov);
        });
        toggleProviderOptions(prov);
        
        localStorage.setItem('symphony_rag_settings', JSON.stringify(state.settings));
        updateHeaderDisplay();
        showToast(`Switched active provider to ${prov.toUpperCase()}`, "success");
    });
}

// Inline file attachment upload button inside chat input bar
const chatUploadBtn = document.getElementById('chat-upload-btn');
const inlineFileInput = document.getElementById('inline-file-input');
if (chatUploadBtn && inlineFileInput) {
    chatUploadBtn.addEventListener('click', () => {
        inlineFileInput.click();
    });
    inlineFileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            showToast(`Uploading ${files[0].name}...`, "info");
            const formData = new FormData();
            formData.append('file', files[0]);
            
            // Resolve credentials for ingestion
            const creds = resolveActiveCredentials();
            formData.append('provider', creds.provider);
            if (creds.apiKey) formData.append('apiKey', creds.apiKey);
            if (creds.ollamaUrl) formData.append('ollamaUrl', creds.ollamaUrl);
            if (creds.embedModel) formData.append('embedModel', creds.embedModel);
            
            try {
                const resp = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData
                });
                const data = await resp.json();
                if (data.status === 'success') {
                    showToast(`Successfully uploaded ${files[0].name}`, "success");
                    await loadDocuments();
                } else {
                    showToast(data.detail || "Upload failed", "error");
                }
            } catch (err) {
                showToast("Failed to upload: " + err.message, "error");
            } finally {
                inlineFileInput.value = '';
            }
        }
    });
}

// --- Subagent Operations Logger ---
state.agentLogs = [];

window.appendAgentLog = function(agentName, message) {
    state.agentLogs = state.agentLogs || [];
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, agent: agentName, message };
    state.agentLogs.push(logEntry);
    
    if (state.agentLogs.length > 200) {
        state.agentLogs.shift();
    }
    
    renderAgentLogs();
};

function renderAgentLogs() {
    const container = document.getElementById('agent-logs-container');
    if (!container) return;
    
    if (!state.agentLogs || state.agentLogs.length === 0) {
        container.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 20px 0;">No active agent operations logged. Ready.</div>`;
        return;
    }
    
    container.innerHTML = state.agentLogs.map(log => {
        let agentColor = 'var(--accent-color)';
        const agentLower = log.agent.toLowerCase();
        if (agentLower === 'researcher') agentColor = 'var(--cyan-color)';
        else if (agentLower === 'developer') agentColor = '#10b981';
        else if (agentLower === 'critic') agentColor = '#f43f5e';
        else if (agentLower === 'planner') agentColor = '#eab308';
        
        return `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: left;">` +
               `<span style="color: var(--text-secondary); font-size: 10px;">[${log.timestamp}]</span> ` +
               `<span style="color: ${agentColor}; font-weight: 700;">[${log.agent.toUpperCase()}]</span> ` +
               `<span>${escapeHtml(log.message)}</span>` +
               `</div>`;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

const clearAgentLogsBtn = document.getElementById('clear-agent-logs-btn');
if (clearAgentLogsBtn) {
    clearAgentLogsBtn.addEventListener('click', () => {
        state.agentLogs = [];
        renderAgentLogs();
        showToast("Agent logs cleared.", "success");
    });
}

window.runCodeSandbox = async function(button, lang) {
    const codeContainer = button.closest('.code-container');
    const codeElement = codeContainer.querySelector('pre code');
    const rawCode = codeElement.innerText;
    const outputPane = codeContainer.querySelector('.sandbox-output-pane');
    
    if (!outputPane) return;
    
    button.disabled = true;
    button.textContent = 'Running...';
    outputPane.style.display = 'block';
    outputPane.innerHTML = `<span style="color: var(--text-secondary);">Executing script in sandbox...</span>`;
    
    try {
        const resp = await fetch('/api/sandbox/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: lang,
                code: rawCode
            })
        });
        const data = await resp.json();
        
        if (data.status === 'success') {
            let outHtml = "";
            if (data.stdout) {
                outHtml += `<div style="color: #10b981; white-space: pre-wrap;">${escapeHtml(data.stdout)}</div>`;
            }
            if (data.stderr) {
                outHtml += `<div style="color: #f43f5e; white-space: pre-wrap;">${escapeHtml(data.stderr)}</div>`;
            }
            if (!data.stdout && !data.stderr) {
                outHtml += `<div style="color: var(--text-secondary);">Script executed with no console output.</div>`;
            }
            outHtml += `<div style="color: var(--text-secondary); margin-top: 6px; font-size: 10px; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px;">Exit code: ${data.exit_code} | Time: ${data.elapsed_ms}ms</div>`;
            outputPane.innerHTML = outHtml;
        } else {
            outputPane.innerHTML = `<div style="color: #f43f5e;">Error: ${escapeHtml(data.detail || "Execution failed")}</div>`;
        }
    } catch (err) {
        outputPane.innerHTML = `<div style="color: #f43f5e;">Network Error: ${escapeHtml(err.message)}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Run';
    }
};

let currentUtterance = null;
window.toggleSpeech = function(text, button) {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (currentUtterance && currentUtterance.text === text) {
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Speak`;
            currentUtterance = null;
            return;
        }
    }
    
    const cleanText = text.replace(/```[\s\S]*?```/g, '[code block]')
                          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                          .replace(/[*_`#]/g, '');
                          
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Speak`;
        currentUtterance = null;
    };
    utterance.onerror = () => {
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Speak`;
        currentUtterance = null;
    };
    
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg> Stop`;
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
};



// TELEMETRY + AGENT FLOW + RAG DIAGNOSTICS utilities
window.setTelemetryLoading = function() {
  // Telemetry chip removed by user request
  return;
};
window.updateAgentFlowNode = function(agentLabel) {
  var strip=document.getElementById('agent-flow-strip');if(!strip)return;strip.style.display='flex';
  var map={'researcher':'researcher','research':'researcher','developer':'developer','dev':'developer','code':'developer','critic':'critic','review':'critic','critique':'critic','finalizer':'finalizer','final':'finalizer','writer':'finalizer'};
  var norm=(agentLabel||'').toLowerCase(),mapped=null;
  Object.keys(map).forEach(function(k){if(!mapped&&norm.indexOf(k)!==-1)mapped=map[k];});
  if(!mapped)return;
  var order=['researcher','developer','critic','finalizer'],ai=order.indexOf(mapped);
  order.forEach(function(nk,i){var n=document.getElementById('flow-node-'+nk);if(!n)return;n.classList.remove('active','done');if(i<ai)n.classList.add('done');else if(i===ai)n.classList.add('active');});
};
window.resetAgentFlowStrip = function() {
  var s=document.getElementById('agent-flow-strip');if(!s)return;s.style.display='none';
  ['researcher','developer','critic','finalizer'].forEach(function(k){var n=document.getElementById('flow-node-'+k);if(n)n.classList.remove('active','done');});
};
window.buildRagDiagnostics = function(telem, sources) {
  var d=document.getElementById('rag-diag-content');if(!d)return;
  var fmt=function(ms){return ms<1000?ms+'ms':(ms/1000).toFixed(2)+'s';};
  var lc=telem.latency_ms<800?'good':telem.latency_ms<2000?'warn':'bad';
  var ch='';
  if(sources&&sources.length>0){
    ch=sources.slice(0,8).map(function(s){var p=Math.round((s.similarity||0)*100),bp=Math.min(100,p),n=(s.doc_name||'Unknown').replace('Web: ','');return '<div class=\'rag-similarity-bar\'><span class=\'rag-chunk-name\'>'+n+'</span><div class=\'rag-bar-track\'><div class=\'rag-bar-fill\' style=\'width:'+bp+'%\'></div></div><span class=\'rag-chunk-pct\'>'+p+'%</span></div>';}).join('');
  }else{ch='<div style=\'font-size:11px;color:var(--text-secondary);text-align:center;padding:12px 0;\'>No document chunks retrieved.</div>';}
  d.innerHTML='<div class=\'rag-diag-section\'><h5>Request Metrics</h5><div class=\'rag-metric-row\'><span class=\'rag-metric-label\'>Response Latency</span><span class=\'rag-metric-value '+lc+'\'>'+fmt(telem.latency_ms)+'</span></div><div class=\'rag-metric-row\'><span class=\'rag-metric-label\'>Cache Status</span><span class=\'rag-metric-value '+(telem.cache_hit?'good':'')+'\'>'+( telem.cache_hit?'Hit':'Miss')+'</span></div><div class=\'rag-metric-row\'><span class=\'rag-metric-label\'>Chunks Retrieved</span><span class=\'rag-metric-value\'>'+(sources?sources.length:0)+'</span></div></div><div class=\'rag-diag-section\'><h5>Chunk Relevance Scores</h5>'+ch+'</div>';
};
(function(){
  var cb=document.getElementById('citations-tab-btn'),db=document.getElementById('rag-diag-tab-btn'),cp=document.getElementById('citations-tab-pane'),dp=document.getElementById('rag-diag-tab-pane');
  if(!cb||!db||!cp||!dp)return;
  function sw(ab,ap,ib,ip){ab.classList.add('active');ib.classList.remove('active');ap.style.display='block';ap.classList.add('active');ip.style.display='none';ip.classList.remove('active');}
  cb.addEventListener('click',function(){sw(cb,cp,db,dp);});
  db.addEventListener('click',function(){sw(db,dp,cb,cp);});
})();
(function(){
  var f=document.getElementById('chat-form');if(!f)return;
  f.addEventListener('submit',function(){if(window.setTelemetryLoading)window.setTelemetryLoading();if(window.resetAgentFlowStrip)window.resetAgentFlowStrip();},true);
})();


/* === INTERACTIVE DIAGRAM & AI IMAGE GENERATOR CONTROLS === */

// Initialize Mermaid Engine
function initMermaidEngine() {
    if (window.mermaid) {
        const isLight = document.body.classList.contains('light-theme') || document.body.classList.contains('theme-light');
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: isLight ? 'default' : 'dark',
                securityLevel: 'loose',
                themeVariables: isLight ? {
                    darkMode: false,
                    background: '#ffffff',
                    mainBkg: '#ffffff',
                    primaryColor: '#e0f2fe',
                    primaryTextColor: '#0f172a',
                    primaryBorderColor: '#0284c7',
                    secondaryColor: '#f1f5f9',
                    secondaryTextColor: '#0f172a',
                    secondaryBorderColor: '#cbd5e1',
                    tertiaryColor: '#f8fafc',
                    tertiaryTextColor: '#0f172a',
                    tertiaryBorderColor: '#e2e8f0',
                    nodeBorder: '#0284c7',
                    nodeTextColor: '#0f172a',
                    lineColor: '#0284c7',
                    textColor: '#0f172a',
                    labelTextColor: '#0f172a',
                    edgeLabelBackground: '#ffffff',
                    clusterBkg: '#f8fafc',
                    clusterBorder: '#cbd5e1',
                    actorBkg: '#e0f2fe',
                    actorTextColor: '#0f172a',
                    actorBorder: '#0284c7',
                    actorLineColor: '#0284c7',
                    signalColor: '#0f172a',
                    signalTextColor: '#0f172a',
                    labelBoxBkgColor: '#ffffff',
                    labelBoxBorderColor: '#cbd5e1'
                } : {
                    darkMode: true,
                    background: '#060812',
                    mainBkg: '#0b1120',
                    primaryColor: '#00f3ff',
                    primaryTextColor: '#f8fafc',
                    primaryBorderColor: '#00f3ff',
                    lineColor: '#00f3ff',
                    nodeBorder: '#00f3ff',
                    nodeTextColor: '#f8fafc',
                    textColor: '#f8fafc',
                    labelTextColor: '#f8fafc',
                    edgeLabelBackground: '#0b1120',
                    clusterBkg: '#0b1120',
                    clusterBorder: '#1e293b'
                }
            });
        } catch(e) {
            console.warn('Mermaid init warning:', e);
        }
    }
}

// Robust Mermaid Code Sanitizer for LLM outputs (NVIDIA NIM, Ollama, Gemini, OpenAI)
function sanitizeMermaidCode(raw) {
    if (!raw) return '';
    let code = raw.trim();

    // 1. Remove markdown wrapper fences if nested
    code = code.replace(/^`{3,}(?:mermaid)?\s*/i, '').replace(/`{3,}\s*$/i, '').trim();

    // 2. Unescape common HTML entities
    code = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    const lines = code.split('\n');
    const cleaned = [];
    let hasDiagramType = false;
    const diagramKeywords = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|mindmap|gantt|pie|gitGraph|quadrantChart|c4Context|requirementDiagram)/i;

    let subIndex = 1;
    for (let line of lines) {
        let t = line.trim();
        if (!t) {
            cleaned.push('');
            continue;
        }

        // Convert python/shell style comments (#) to Mermaid comments (%%)
        if (t.startsWith('#')) {
            cleaned.push('%% ' + t.replace(/^#+\s*/, ''));
            continue;
        }

        // Identify diagram type header
        if (!hasDiagramType && diagramKeywords.test(t)) {
            hasDiagramType = true;
            // Ensure bare "graph" or "flowchart" has a direction
            if (/^(graph|flowchart)$/i.test(t)) {
                t = 'graph TD';
            }
            cleaned.push(t);
            continue;
        }

        // Remove trailing semicolons from diagram statements
        t = t.replace(/;+\s*$/, '');

        // Fix unquoted subgraphs: e.g. "subgraph User Authentication" -> 'subgraph sub_1 ["User Authentication"]'
        const subMatch = t.match(/^subgraph\s+([^\["\n]+?)$/i);
        if (subMatch && !t.includes('[') && !t.includes('"')) {
            const subTitle = subMatch[1].trim();
            if (subTitle && subTitle.toLowerCase() !== 'end') {
                t = `subgraph sub_${subIndex++} ["${subTitle}"]`;
            }
        }

        // Fix unquoted labels containing special characters in [ ... ]
        t = t.replace(/(\b[a-zA-Z0-9_-]+)\[([^"\]\n]+?)\]/g, (match, id, inner) => {
            if (/[\(\)&:;\?\/,#]/.test(inner) && !inner.startsWith('"') && !inner.endsWith('"')) {
                return `${id}["${inner.trim()}"]`;
            }
            return match;
        });

        // Fix unquoted labels containing special characters in { ... }
        t = t.replace(/(\b[a-zA-Z0-9_-]+)\{([^"\}\n]+?)\}/g, (match, id, inner) => {
            if (/[\(\)&:;\?\/,#]/.test(inner) && !inner.startsWith('"') && !inner.endsWith('"')) {
                return `${id}{"${inner.trim()}"}`;
            }
            return match;
        });

        // Fix unquoted labels containing special characters in -->|...|
        t = t.replace(/-->\|([^"\|\n]+?)\|/g, (match, inner) => {
            if (/[\(\)&:;\?\/,#]/.test(inner) && !inner.startsWith('"') && !inner.endsWith('"')) {
                return `-->|"${inner.trim()}"|`;
            }
            return match;
        });

        cleaned.push(t);
    }

    // If no diagram type declaration was encountered, default to graph TD
    if (!hasDiagramType) {
        cleaned.unshift('graph TD');
    }

    return cleaned.join('\n');
}

function aggressiveSanitizeMermaid(code) {
    if (!code) return '';
    let res = sanitizeMermaidCode(code);
    // Quote all square bracket node texts
    res = res.replace(/(\b[a-zA-Z0-9_-]+)\[([^"\]\n]+?)\]/g, (m, id, inner) => `${id}["${inner.replace(/"/g, "'").trim()}"]`);
    res = res.replace(/(\b[a-zA-Z0-9_-]+)\{([^"\}\n]+?)\}/g, (m, id, inner) => `${id}{"${inner.replace(/"/g, "'").trim()}"}`);
    return res;
}

// Render all Mermaid diagram panes inside a container
async function renderMermaidDiagrams(container) {
    if (!window.mermaid || !container) return;
    initMermaidEngine();
    
    const panes = container.querySelectorAll('.mermaid-render-pane');
    for (let pane of panes) {
        if (pane.dataset.rendered === 'true') continue;
        const rawCode = decodeURIComponent(pane.dataset.code || '');
        if (!rawCode) continue;

        const sanitized = sanitizeMermaidCode(rawCode);
        
        try {
            const uniqueId = 'svg-' + Math.random().toString(36).substring(2, 9);
            const { svg } = await mermaid.render(uniqueId, sanitized);
            pane.innerHTML = svg;
            pane.dataset.rendered = 'true';
        } catch (err) {
            // Clean up stray Mermaid error SVGs added to document body by mermaid.js
            try {
                const strayErrors = document.querySelectorAll('svg[id^="dsvg-"]');
                strayErrors.forEach(s => s.remove());
            } catch(e) {}

            // Second pass: attempt aggressive repair before displaying notice
            try {
                const aggressive = aggressiveSanitizeMermaid(rawCode);
                const retryId = 'svg-retry-' + Math.random().toString(36).substring(2, 9);
                const { svg: retrySvg } = await mermaid.render(retryId, aggressive);
                pane.innerHTML = retrySvg;
                pane.dataset.rendered = 'true';
                continue;
            } catch (retryErr) {
                try {
                    const strayErrors = document.querySelectorAll('svg[id^="dsvg-"]');
                    strayErrors.forEach(s => s.remove());
                } catch(e) {}
            }
            
            console.warn('Mermaid render error:', err);
            const escapedCode = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            pane.innerHTML = `
                <div style="font-size: 11.5px; color: var(--red-alert, #f43f5e); padding: 12px; background: rgba(244, 63, 94, 0.07); border-radius: 8px; text-align: left; width: 100%;">
                    <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span>Diagram Notice: Syntax parsing issue</span>
                    </div>
                    <div style="font-size: 11px; opacity: 0.85; margin-bottom: 8px;">${err.message || 'Could not parse diagram structure.'}</div>
                    <pre style="margin: 0; font-size: 10.5px; color: var(--text-secondary); background: rgba(0, 0, 0, 0.35); padding: 8px 10px; border-radius: 6px; overflow-x: auto; font-family: monospace;"><code>${escapedCode}</code></pre>
                </div>`;
            pane.dataset.rendered = 'true';
        }
    }
}

// Mermaid Utility Actions
window.copyMermaidCode = function(diagramId) {
    const pane = document.getElementById(diagramId);
    if (pane && pane.dataset.code) {
        navigator.clipboard.writeText(decodeURIComponent(pane.dataset.code));
        showToast('Mermaid code copied to clipboard!', 'success');
    }
};

window.exportMermaidSvg = function(diagramId) {
    const pane = document.getElementById(diagramId);
    const svg = pane?.querySelector('svg');
    if (!svg) { showToast('No rendered SVG found to export.', 'error'); return; }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_diagram_${diagramId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported SVG diagram!', 'success');
};

window.exportMermaidPng = function(diagramId) {
    const pane = document.getElementById(diagramId);
    const svg = pane?.querySelector('svg');
    if (!svg) { showToast('No rendered SVG found to export.', 'error'); return; }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.fillStyle = document.body.classList.contains('light-theme') ? '#ffffff' : '#060812';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `nexus_diagram_${diagramId}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported PNG diagram!', 'success');
    };
    img.src = url;
};

// Image Lightbox & Save to Workspace
window.openImageLightbox = function(url) {
    window.open(url, '_blank');
};

window.saveImageToWorkspace = async function(url, alt) {
    showToast('Image saved to static/generated_images/ folder!', 'success');
};

// Diagram Studio Modal Logic
const diagramModalBtn = document.getElementById('diagram-modal-btn');
const diagramGenModal = document.getElementById('diagram-gen-modal');
const diagramModalClose = document.getElementById('diagram-modal-close');
const diagramModalCancel = document.getElementById('diagram-modal-cancel');
const diagramCodeEditor = document.getElementById('diagram-code-editor');
const diagramPreviewPane = document.getElementById('diagram-preview-pane');
const diagramTypeSelect = document.getElementById('diagram-type-select');
const diagramPromptInput = document.getElementById('diagram-prompt-input');
const diagramAiGenBtn = document.getElementById('diagram-ai-gen-btn');
const diagramInsertChatBtn = document.getElementById('diagram-insert-chat-btn');

const sampleDiagrams = {
    flowchart: `graph TD\n    A[Client Request] --> B[FastAPI Gateway]\n    B --> C{Semantic Cache?}\n    C -- Hit --> D[Instant Response]\n    C -- Miss --> E[Hybrid Search]\n    E --> F[LLM Generation]\n    F --> G[Stream Result]`,
    sequence: `sequenceDiagram\n    autonumber\n    actor User as User / Client\n    participant API as FastAPI Gateway\n    participant RAG as RAG Pipeline\n    participant DB as SQLite / Vector Cache\n\n    User->>API: POST /chat (Query)\n    API->>RAG: Hybrid Search (HyDE + BM25)\n    RAG->>DB: Cosine Similarity Lookup\n    DB-->>RAG: Document Chunks\n    RAG-->>API: Streamed Tokens (SSE)\n    API-->>User: Render Answer & Citations`,
    architecture: `classDiagram\n    class FastAPIApp {\n        +db: Database\n        +chat_stream()\n        +run_security_audit()\n    }\n    class RAGEngine {\n        +chunk_text()\n        +get_embedding()\n        +generate_hyde_text()\n    }\n    class Database {\n        +init_db()\n        +add_document()\n        +search_hybrid()\n    }\n    FastAPIApp --> Database\n    FastAPIApp ..> RAGEngine`,
    mindmap: `mindmap\n  root((RAG Nexus))\n    Core Engine\n      HyDE Expansion\n      BM25 Lexical Search\n      Semantic Cache\n    Generators\n      Diagram Generator\n      AI Image Generator\n    Security\n      OWASP Scanner\n      Sandbox Execution`,
    state: `stateDiagram-v2\n    [*] --> Idle\n    Idle --> Listening: Wake Word\n    Listening --> Processing: User Speech\n    Processing --> Streaming: LLM Tokens\n    Streaming --> Idle: Done`,
    er: `erDiagram\n    CONVERSATION ||--o{ MESSAGE : contains\n    DOCUMENT ||--o{ CHUNK : has\n    CACHE ||--|| QUERY : caches`
};

async function renderStudioPreview() {
    if (!window.mermaid || !diagramPreviewPane || !diagramCodeEditor) return;
    initMermaidEngine();
    const code = diagramCodeEditor.value.trim();
    try {
        const uniqueId = 'studio-svg-' + Date.now();
        const { svg } = await mermaid.render(uniqueId, code);
        diagramPreviewPane.innerHTML = svg;
    } catch (err) {
        diagramPreviewPane.innerHTML = `<div style="font-size:11px;color:#f43f5e;">Diagram Error: ${err.message || err}</div>`;
    }
}

if (diagramModalBtn) {
    diagramModalBtn.addEventListener('click', () => {
        diagramGenModal.style.display = 'flex';
        renderStudioPreview();
    });
}
if (diagramModalClose) diagramModalClose.addEventListener('click', () => diagramGenModal.style.display = 'none');
if (diagramModalCancel) diagramModalCancel.addEventListener('click', () => diagramGenModal.style.display = 'none');

if (diagramTypeSelect) {
    diagramTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (sampleDiagrams[val]) {
            diagramCodeEditor.value = sampleDiagrams[val];
            renderStudioPreview();
        }
    });
}

if (diagramCodeEditor) {
    let debounceTimer;
    diagramCodeEditor.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(renderStudioPreview, 400);
    });
}

if (diagramAiGenBtn) {
    diagramAiGenBtn.addEventListener('click', async () => {
        const prompt = diagramPromptInput?.value.trim() || 'RAG Architecture Workflow';
        const dtype = diagramTypeSelect?.value || 'flowchart';
        diagramAiGenBtn.disabled = true;
        diagramAiGenBtn.textContent = 'Generating Diagram...';
        
        try {
            const res = await fetch('/api/diagram/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, diagramType: dtype })
            });
            const data = await res.json();
            if (data.mermaidCode) {
                diagramCodeEditor.value = data.mermaidCode;
                renderStudioPreview();
                showToast('AI Diagram generated successfully!', 'success');
            }
        } catch (e) {
            console.error('Diagram gen error:', e);
            showToast('Failed to generate diagram: ' + e.message, 'error');
        } finally {
            diagramAiGenBtn.disabled = false;
            diagramAiGenBtn.textContent = 'Generate with AI';
        }
    });
}

if (diagramInsertChatBtn) {
    diagramInsertChatBtn.addEventListener('click', () => {
        const code = diagramCodeEditor?.value.trim();
        if (!code) return;
        const queryInput = document.getElementById('query-input');
        if (queryInput) {
            queryInput.value = `Here is the diagram:\n\n\`\`\`mermaid\n${code}\n\`\`\``;
        }
        diagramGenModal.style.display = 'none';
        showToast('Diagram code loaded into chat input!', 'success');
    });
}

// AI Image Generator Studio Modal Logic
const imageModalBtn = document.getElementById('image-modal-btn');
const imageGenModal = document.getElementById('image-gen-modal');
const imageModalClose = document.getElementById('image-modal-close');
const triggerGenImageBtn = document.getElementById('trigger-generate-image-btn');
const imagePromptInput = document.getElementById('image-prompt-input');
const imageDimensionSelect = document.getElementById('image-dimension-select');
const imageModelSelect = document.getElementById('image-model-select');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const imagePreviewImg = document.getElementById('image-preview-img');
const imageDownloadLink = document.getElementById('image-download-link');
const imageInsertChatBtn = document.getElementById('image-insert-chat-btn');

let latestGeneratedImageUrl = '';
let latestGeneratedPrompt = '';

if (imageModalBtn) {
    imageModalBtn.addEventListener('click', () => {
        imageGenModal.style.display = 'flex';
    });
}
if (imageModalClose) imageModalClose.addEventListener('click', () => imageGenModal.style.display = 'none');

if (triggerGenImageBtn) {
    triggerGenImageBtn.addEventListener('click', async () => {
        const prompt = imagePromptInput?.value.trim();
        if (!prompt) {
            showToast('Please provide a prompt description.', 'error');
            return;
        }
        
        const dims = (imageDimensionSelect?.value || '1024x1024').split('x');
        const width = parseInt(dims[0]) || 1024;
        const height = parseInt(dims[1]) || 1024;
        const model = imageModelSelect?.value || 'flux';
        
        triggerGenImageBtn.disabled = true;
        triggerGenImageBtn.textContent = 'Generating AI Image (this takes a few seconds)...';
        
        try {
            const res = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, width, height, model, seed: Math.floor(Math.random() * 999999) })
            });
            const data = await res.json();
            
            if (data.status === 'success' && data.imageUrl) {
                latestGeneratedImageUrl = data.imageUrl;
                latestGeneratedPrompt = prompt;
                
                if (imagePreviewImg) imagePreviewImg.src = data.imageUrl;
                if (imageDownloadLink) imageDownloadLink.href = data.imageUrl;
                if (imagePreviewWrapper) imagePreviewWrapper.style.display = 'flex';
                
                showToast('AI Image generated successfully!', 'success');
            } else {
                throw new Error(data.message || 'Image generation failed');
            }
        } catch (e) {
            console.error('Image gen error:', e);
            showToast('Failed to generate image: ' + e.message, 'error');
        } finally {
            triggerGenImageBtn.disabled = false;
            triggerGenImageBtn.textContent = 'Generate AI Image';
        }
    });
}

if (imageInsertChatBtn) {
    imageInsertChatBtn.addEventListener('click', () => {
        if (!latestGeneratedImageUrl) return;
        const queryInput = document.getElementById('query-input');
        if (queryInput) {
            queryInput.value = `![${latestGeneratedPrompt}](${latestGeneratedImageUrl})`;
        }
        imageGenModal.style.display = 'none';
        showToast('Image markdown loaded into chat input!', 'success');
    });
}

// Call renderMermaidDiagrams in appendMessage & DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initMermaidEngine();
    const chatHist = document.getElementById('chat-history');
    if (chatHist) renderMermaidDiagrams(chatHist);
});

// --- Direct URL & YouTube Ingestion Handler ---
async function ingestUrlFromInput() {
    const urlInput = document.getElementById('url-ingest-input');
    const ingestBtn = document.getElementById('url-ingest-btn');
    if (!urlInput) return;
    
    const url = urlInput.value.trim();
    if (!url) {
        showToast("Please enter a valid web URL or YouTube link.", "warning");
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast("URL must start with http:// or https://", "warning");
        return;
    }
    
    const origBtnText = ingestBtn.innerHTML;
    ingestBtn.disabled = true;
    ingestBtn.innerHTML = `<span class="spinner-small"></span> <span>Ingesting...</span>`;
    showToast("Fetching and indexing URL into vector database...", "info");
    
    try {
        const payload = {
            url: url,
            provider: state.settings.provider,
            apiKey: state.settings.apiKey || state.settings.openaiKey || state.settings.claudeKey,
            ollamaUrl: state.settings.ollamaUrl,
            embedModel: state.settings.embedModel
        };
        
        const resp = await fetch('/api/documents/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!resp.ok) {
            const errData = await resp.json();
            throw new Error(errData.detail || "Failed to ingest URL");
        }
        
        const result = await resp.json();
        urlInput.value = '';
        showToast(`Indexed "${result.name}" (${result.chunk_count} chunks)!`, "success");
        await loadDocuments();
    } catch (err) {
        showToast(`Error ingesting URL: ${err.message}`, "error");
    } finally {
        ingestBtn.disabled = false;
        ingestBtn.innerHTML = origBtnText;
    }
}
window.ingestUrlFromInput = ingestUrlFromInput;

document.addEventListener('DOMContentLoaded', () => {
    const ingestBtn = document.getElementById('url-ingest-btn');
    const urlInput = document.getElementById('url-ingest-input');
    if (ingestBtn) {
        ingestBtn.addEventListener('click', ingestUrlFromInput);
    }
    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                ingestUrlFromInput();
            }
        });
    }
});


// =========================================================
// CHART.JS ENGINE & UTILITIES
// =========================================================
function renderChartJsVisualizations(container) {
    if (!window.Chart || !container) return;
    const canvases = container.querySelectorAll('.nexus-chart-canvas');
    const isLight = document.body.classList.contains('light-theme') || document.body.classList.contains('theme-light');
    
    canvases.forEach(canvas => {
        if (canvas.dataset.rendered === 'true') return;
        const rawJson = canvas.getAttribute('data-chart-spec');
        if (!rawJson) return;
        try {
            const spec = JSON.parse(decodeURIComponent(rawJson));
            if (!spec || !spec.data) return;
            
            const textColor = isLight ? '#0f172a' : '#f8fafc';
            const textMuted = isLight ? '#334155' : '#94a3b8';
            const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
            const tooltipBg = isLight ? '#ffffff' : '#0f172a';
            const tooltipBorder = isLight ? '#cbd5e1' : '#334155';

            Chart.defaults.color = textMuted;
            Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            
            if (!spec.options) spec.options = {};
            spec.options.responsive = true;
            spec.options.maintainAspectRatio = false;
            
            if (!spec.options.plugins) spec.options.plugins = {};
            
            // Legend styling
            spec.options.plugins.legend = Object.assign({
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    usePointStyle: true,
                    color: textColor,
                    font: { weight: '600', size: 12 }
                }
            }, spec.options.plugins.legend || {});
            if (spec.options.plugins.legend.labels) {
                spec.options.plugins.legend.labels.color = textColor;
            }

            // Title plugin styling
            if (spec.options.plugins.title) {
                spec.options.plugins.title.color = textColor;
                spec.options.plugins.title.font = Object.assign({ weight: '700', size: 13 }, spec.options.plugins.title.font || {});
            }

            // Tooltip styling
            spec.options.plugins.tooltip = Object.assign({
                backgroundColor: tooltipBg,
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: 10,
                boxPadding: 4,
                usePointStyle: true
            }, spec.options.plugins.tooltip || {});
            spec.options.plugins.tooltip.titleColor = textColor;
            spec.options.plugins.tooltip.bodyColor = textColor;
            spec.options.plugins.tooltip.backgroundColor = tooltipBg;
            spec.options.plugins.tooltip.borderColor = tooltipBorder;
            
            // Scales for bar / line / scatter
            if (spec.type === 'bar' || spec.type === 'line' || spec.type === 'scatter') {
                if (!spec.options.scales) spec.options.scales = {};
                ['x', 'y'].forEach(axis => {
                    if (!spec.options.scales[axis]) spec.options.scales[axis] = {};
                    spec.options.scales[axis].grid = Object.assign({
                        color: gridColor
                    }, spec.options.scales[axis].grid || {});
                    spec.options.scales[axis].ticks = Object.assign({
                        color: textMuted,
                        font: { weight: '500', size: 11 }
                    }, spec.options.scales[axis].ticks || {});
                    spec.options.scales[axis].ticks.color = textMuted;
                    if (spec.options.scales[axis].title) {
                        spec.options.scales[axis].title.color = textColor;
                        spec.options.scales[axis].title.font = Object.assign({ weight: '600', size: 11 }, spec.options.scales[axis].title.font || {});
                    }
                });
            }

            // Radial scales (radar, polarArea)
            if (spec.options.scales && spec.options.scales.r) {
                spec.options.scales.r.grid = Object.assign({ color: gridColor }, spec.options.scales.r.grid || {});
                spec.options.scales.r.angleLines = Object.assign({ color: gridColor }, spec.options.scales.r.angleLines || {});
                spec.options.scales.r.ticks = Object.assign({ color: textMuted }, spec.options.scales.r.ticks || {});
                spec.options.scales.r.ticks.color = textMuted;
                spec.options.scales.r.ticks.backdropColor = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)';
                spec.options.scales.r.pointLabels = Object.assign({ color: textColor }, spec.options.scales.r.pointLabels || {});
                spec.options.scales.r.pointLabels.color = textColor;
            }
            
            const chartInstance = new Chart(canvas, spec);
            canvas.dataset.rendered = 'true';
            
            // Build data table view
            const tableDiv = document.getElementById(canvas.id + '-table');
            if (tableDiv && spec.data.labels) {
                let ths = `<th>Index</th><th>${spec.data.labels[0] ? 'Label' : 'Category'}</th>`;
                (spec.data.datasets || []).forEach(ds => {
                    ths += `<th>${ds.label || 'Value'}</th>`;
                });
                
                let trs = '';
                spec.data.labels.forEach((lbl, rIdx) => {
                    let tds = `<td>${rIdx + 1}</td><td><strong>${lbl}</strong></td>`;
                    (spec.data.datasets || []).forEach(ds => {
                        const val = ds.data && ds.data[rIdx] !== undefined ? ds.data[rIdx] : '-';
                        tds += `<td>${val}</td>`;
                    });
                    trs += `<tr>${tds}</tr>`;
                });
                
                tableDiv.innerHTML = `<table class="nexus-chart-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
            }
        } catch(err) {
            console.warn('Failed to render Chart.js chart:', err);
        }
    });
}
window.renderChartJsVisualizations = renderChartJsVisualizations;

function exportChartPng(canvasId, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_chart_${(title || 'export').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    a.click();
    showToast("Chart exported as PNG!", "success");
}
window.exportChartPng = exportChartPng;

function toggleChartTable(btn, chartId) {
    const tableDiv = document.getElementById(chartId + '-table');
    if (!tableDiv) return;
    const isShown = tableDiv.style.display === 'block';
    tableDiv.style.display = isShown ? 'none' : 'block';
    btn.style.color = isShown ? 'var(--text-secondary)' : 'var(--cyan-color)';
}
window.toggleChartTable = toggleChartTable;

// =========================================================
// DEEP RESEARCH STEPPER & RAG EVALUATION HANDLERS
// =========================================================
function handleResearchStep(stepData, stream) {
    if (!stream || !stream.assistantBubble) return;
    let stepper = stream.assistantBubble.querySelector('.research-stepper-card');
    if (!stepper) {
        stepper = document.createElement('div');
        stepper.className = 'research-stepper-card';
        stepper.innerHTML = `
            <div class="research-stepper-header">
                <div class="research-stepper-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Autonomous Deep Research Pipeline</span>
                </div>
                <span class="research-stepper-status" style="color: #a855f7; font-size: 11px;">Active</span>
            </div>
            <div class="research-steps-track">
                <div class="research-step-pill active" data-stage="planning">
                    <span class="research-step-num">Step 1</span>
                    <span class="research-step-label">Deconstruct</span>
                </div>
                <div class="research-step-pill" data-stage="searching">
                    <span class="research-step-num">Step 2</span>
                    <span class="research-step-label">Multi-Vector</span>
                </div>
                <div class="research-step-pill" data-stage="browsing">
                    <span class="research-step-num">Step 3</span>
                    <span class="research-step-label">Web Reading</span>
                </div>
                <div class="research-step-pill" data-stage="synthesizing">
                    <span class="research-step-num">Step 4</span>
                    <span class="research-step-label">Synthesize</span>
                </div>
            </div>
            <div class="research-sources-box" style="display: none;">
                <div class="research-sources-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <span>Visited Primary Sources</span>
                </div>
                <div class="research-sources-grid"></div>
            </div>
        `;
        stream.assistantBubble.insertBefore(stepper, stream.assistantContentDiv);
    }
    
    const stage = stepData.stage;
    const stages = ['planning', 'searching', 'browsing', 'synthesizing'];
    const currentIdx = stages.indexOf(stage);
    
    const pills = stepper.querySelectorAll('.research-step-pill');
    pills.forEach((pill, idx) => {
        pill.classList.remove('active', 'completed');
        if (idx < currentIdx) {
            pill.classList.add('completed');
        } else if (idx === currentIdx) {
            pill.classList.add('active');
        }
    });
    
    if (stepData.sources && Array.isArray(stepData.sources)) {
        const sourcesBox = stepper.querySelector('.research-sources-box');
        const grid = stepper.querySelector('.research-sources-grid');
        if (sourcesBox && grid) {
            sourcesBox.style.display = 'block';
            grid.innerHTML = stepData.sources.map(s => {
                let domain = 'web source';
                try { domain = (new URL(s.url)).hostname.replace('www.', ''); } catch(e){}
                return `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="research-source-tag" title="${s.title}">
                    <span style="color: #a855f7;">🌐</span>
                    <span>${domain}</span>
                </a>`;
            }).join('');
        }
    }
}
window.handleResearchStep = handleResearchStep;

function handleResearchComplete(stream) {
    if (!stream || !stream.assistantBubble) return;
    const stepper = stream.assistantBubble.querySelector('.research-stepper-card');
    if (stepper) {
        const status = stepper.querySelector('.research-stepper-status');
        if (status) {
            status.textContent = 'Completed';
            status.style.color = '#10b981';
        }
        stepper.querySelectorAll('.research-step-pill').forEach(p => {
            p.classList.remove('active');
            p.classList.add('completed');
        });
    }
}
window.handleResearchComplete = handleResearchComplete;

function handleRagEval(evalData, stream) {
    if (!evalData || !evalData.has_rag || !stream || !stream.assistantBubble) return;
    let badge = stream.assistantBubble.querySelector('.rag-grounding-badge');
    if (badge) return;
    
    badge = document.createElement('div');
    const isVerified = evalData.grounding_score >= 80;
    const isPartial = evalData.grounding_score >= 60 && !isVerified;
    const badgeClass = isVerified ? 'verified' : (isPartial ? 'partial' : 'speculative');
    const badgeIcon = isVerified ? '🛡️' : (isPartial ? '⚠️' : 'ℹ️');
    
    badge.className = `rag-grounding-badge ${badgeClass}`;
    badge.style.position = 'relative';
    badge.innerHTML = `
        <span>${badgeIcon}</span>
        <span>${evalData.grounding_score}% Grounded</span>
        <span style="opacity: 0.6; font-size: 10px;">(${evalData.risk_level})</span>
        <div class="rag-grounding-popover">
            <div class="grounding-stat-row">
                <span class="grounding-stat-label">Grounding Confidence:</span>
                <span class="grounding-stat-value" style="color: ${evalData.status_color};">${evalData.grounding_score}%</span>
            </div>
            <div class="grounding-stat-row">
                <span class="grounding-stat-label">Context Relevance:</span>
                <span class="grounding-stat-value">${evalData.context_relevance}%</span>
            </div>
            <div class="grounding-stat-row">
                <span class="grounding-stat-label">Verified Assertions:</span>
                <span class="grounding-stat-value">${evalData.verified_claims} / ${evalData.total_claims}</span>
            </div>
            <div style="font-weight: 600; color: var(--text-secondary); margin-top: 4px; font-size: 10px;">Claim Substantiations:</div>
            <div class="grounding-claims-list">
                ${(evalData.claims || []).map(c => `
                    <div class="grounding-claim-item ${c.grounded ? '' : 'unverified'}">
                        <div class="grounding-claim-text">${c.claim}</div>
                        <div class="grounding-claim-src">Source: ${c.source} • ${c.confidence}% alignment</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const pop = badge.querySelector('.rag-grounding-popover');
        if (pop) pop.classList.toggle('open');
    });
    
    stream.assistantBubble.appendChild(badge);
}
window.handleRagEval = handleRagEval;

// Document click to dismiss grounding popovers
document.addEventListener('click', () => {
    document.querySelectorAll('.rag-grounding-popover.open').forEach(p => p.classList.remove('open'));
});
