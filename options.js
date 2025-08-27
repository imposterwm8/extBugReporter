document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.querySelectorAll('input[name="aiMode"]').forEach(radio => {
  radio.addEventListener('change', toggleConfigSections);
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      aiMode: 'gemini', // Default to Gemini
      geminiApiKey: ''
    });
    
    // Set radio button
    document.querySelector(`input[value="${settings.aiMode}"]`).checked = true;
    
    // Set API key if exists
    if (settings.geminiApiKey) {
      document.getElementById('geminiKey').value = settings.geminiApiKey;
    }
    
    // Show appropriate config sections
    toggleConfigSections();
    
    console.log('Settings loaded:', { aiMode: settings.aiMode, hasKey: !!settings.geminiApiKey });
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  try {
    const aiMode = document.querySelector('input[name="aiMode"]:checked').value;
    const geminiApiKey = document.getElementById('geminiKey').value.trim();
    
    // Validate Gemini API key if that mode is selected
    if (aiMode === 'gemini' && !geminiApiKey) {
      showStatus('Please enter a Gemini API key', 'error');
      return;
    }
    
    // Save to chrome storage
    await chrome.storage.sync.set({
      aiMode: aiMode,
      geminiApiKey: geminiApiKey
    });
    
    showStatus('Settings saved successfully! 🎉', 'success');
    
    console.log('Settings saved:', { aiMode, hasKey: !!geminiApiKey });
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

function toggleConfigSections() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked').value;
  
  // Show/hide Gemini config
  const geminiConfig = document.getElementById('geminiConfig');
  if (selectedMode === 'gemini') {
    geminiConfig.style.display = 'block';
  } else {
    geminiConfig.style.display = 'none';
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
  
  // Hide after 3 seconds for success, 5 seconds for error
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, type === 'success' ? 3000 : 5000);
}

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }
  
  // Esc to clear status
  if (e.key === 'Escape') {
    document.getElementById('status').style.display = 'none';
  }
});

// Auto-save API key changes after a delay
let saveTimeout;
document.getElementById('geminiKey').addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (document.querySelector('input[value="gemini"]').checked) {
      saveSettings();
    }
  }, 2000); // Auto-save after 2 seconds of no typing
});