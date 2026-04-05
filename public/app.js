// ============================================
// Meditation Web App - Client-Side JavaScript
// ============================================

// State
let currentMeditationId = null;
let currentMeditationType = null;
let currentMeditationGender = 'female';
let meditationTextExpanded = true;

// Hebrew type names for file naming
const typeNames = {
  relaxation: 'הרפיה',
  sleep: 'שינה',
  focus: 'מיקוד',
  healing: 'ריפוי-רגשי',
  'self-love': 'אהבה-עצמית',
};

function getMeditationFileName(type, ext) {
  const name = typeNames[type] || 'מדיטציה';
  const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
  return `מדיטציה-${name}-${date}.${ext}`;
}

// ============================================
// Show/Hide Custom Type Input
// ============================================

function showCustomType() {
  document.getElementById('customTypeContainer').style.display = 'block';
}

function hideCustomType() {
  document.getElementById('customTypeContainer').style.display = 'none';
  document.getElementById('customType').value = '';
}

// DOM Elements
const formSection = document.getElementById('formSection');
const resultsSection = document.getElementById('resultsSection');
const meditationForm = document.getElementById('meditationForm');
const createBtn = document.getElementById('createBtn');
const meditationText = document.getElementById('meditationText');
const toggleTextBtn = document.getElementById('toggleTextBtn');
const toggleTextIcon = document.getElementById('toggleTextIcon');
const audioLoading = document.getElementById('audioLoading');
const audioPlayer = document.getElementById('audioPlayer');
const audio = document.getElementById('audio');
const audioSource = document.getElementById('audioSource');
const downloadAudioBtn = document.getElementById('downloadAudioBtn');
const imageLoading = document.getElementById('imageLoading');
const imageContainer = document.getElementById('imageContainer');
const meditationImage = document.getElementById('meditationImage');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const createAnotherBtn = document.getElementById('createAnotherBtn');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

// ============================================
// Form Submission
// ============================================

meditationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form data
  const formData = new FormData(meditationForm);
  let type = formData.get('type');
  const duration = 3;
  const topic = formData.get('topic').trim();
  const style = formData.get('style');
  const gender = formData.get('gender');

  // Handle custom type
  if (type === 'custom') {
    const customType = document.getElementById('customType').value.trim();
    if (!customType) {
      alert('אנא הזן סוג מדיטציה');
      return;
    }
    type = 'relaxation'; // Default for API, but we'll use topic for custom
  }

  // Build request
  const request = {
    type,
    duration,
    style,
    gender,
  };

  // If custom type selected, send BOTH: custom type + optional topic
  if (formData.get('type') === 'custom') {
    const customTypeValue = document.getElementById('customType').value.trim();
    request.topic = topic
      ? `${customTypeValue} | דגש נוסף: ${topic}`
      : customTypeValue;
  } else if (topic) {
    request.topic = topic;
  }

  // Disable form and show loading
  createBtn.disabled = true;
  createBtn.innerHTML = `
    <span class="spinner" style="width: 20px; height: 20px; margin-left: 8px;"></span>
    <span>יוצר מדיטציה...</span>
  `;

  try {
    // Create meditation
    const response = await fetch('/api/meditation/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (response.status === 429) {
      const errData = await response.json();
      alert(errData.error || 'הגעת למגבלת השימוש. נסי שוב מאוחר יותר ⏳');
      createBtn.disabled = false;
      createBtn.innerHTML = `
        <span class="btn-text">צור מדיטציה</span>
        <span class="btn-icon">✨</span>
      `;
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to create meditation');
    }

    const meditation = await response.json();
    currentMeditationId = meditation.id;
    currentMeditationType = meditation.type;

    // Store meditation info for file naming
    currentMeditationGender = gender;

    // Show results
    showResults(meditation);

    // Start generating audio (image flow temporarily disabled)
    generateAudio(meditation.id, gender);
    // generateImage(meditation.id, meditation.type);

  } catch (error) {
    console.error('Error creating meditation:', error);

    // Check if it's a connection error (server is down)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      alert('😔 אופס! לא הצלחנו להתחבר לשרת. נסי שוב בעוד כמה דקות.');
    } else {
      alert('😔 משהו השתבש ביצירת המדיטציה. נסי שוב.');
    }

    // Re-enable form
    createBtn.disabled = false;
    createBtn.innerHTML = `
      <span class="btn-text">צור מדיטציה</span>
      <span class="btn-icon">✨</span>
    `;
  }
});

// ============================================
// Show Results
// ============================================

function showResults(meditation) {
  // Hide form
  formSection.style.display = 'none';

  // Show results section
  resultsSection.style.display = 'block';

  // Set meditation text
  meditationText.textContent = meditation.text;
  meditationText.classList.remove('collapsed');
  meditationTextExpanded = true;

  // Reset audio (image flow temporarily disabled)
  audioLoading.style.display = 'flex';
  audioPlayer.style.display = 'none';
  // imageLoading.style.display = 'flex';
  // imageContainer.style.display = 'none';

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// Toggle Text Collapse
// ============================================

toggleTextBtn.addEventListener('click', () => {
  if (meditationTextExpanded) {
    meditationText.classList.add('collapsed');
    toggleTextIcon.textContent = '👁️';
    meditationTextExpanded = false;
  } else {
    meditationText.classList.remove('collapsed');
    toggleTextIcon.textContent = '🙈';
    meditationTextExpanded = true;
  }
});

// ============================================
// Generate Audio
// ============================================

async function generateAudio(meditationId, gender) {
  try {
    console.log('Generating audio...');

    // Get meditation text first
    const meditationTextContent = meditationText.textContent;

    const response = await fetch('/api/meditation/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: meditationTextContent,
        meditationId: meditationId,
        gender: gender || 'female'
      }),
    });

    console.log('Audio response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Audio error response:', errorData);
      if (response.status === 429) {
        throw new Error(errorData.error || 'הגעת למגבלת ההקלטות 🎙️');
      }
      throw new Error(errorData.error || 'Failed to generate audio');
    }

    const result = await response.json();
    console.log('Audio result:', result);
    console.log('Audio generated successfully');

    // Convert base64 to data URL
    const audioDataUrl = `data:${result.contentType};base64,${result.audio}`;

    // Show audio player
    audioSource.src = audioDataUrl;
    audio.load();
    audioLoading.style.display = 'none';
    audioPlayer.style.display = 'block';

    // Set download link with meaningful Hebrew name
    downloadAudioBtn.href = audioDataUrl;
    downloadAudioBtn.download = getMeditationFileName(currentMeditationType, 'mp3');

  } catch (error) {
    console.error('Error generating audio:', error);
    audioLoading.innerHTML = `
      <p style="color: #EF4444;">❌ לא הצלחנו ליצור את ההקלטה</p>
      <p style="font-size: 0.9rem; color: #9CA3AF;">נסי שוב בעוד כמה רגעים</p>
      <button class="btn btn-secondary" onclick="generateAudio('${meditationId}', '${gender}')">נסי שוב</button>
    `;
  }
}

// ============================================
// Generate Image
// ============================================

async function generateImage(meditationId, meditationType) {
  try {
    console.log('Generating image...');

    const response = await fetch('/api/meditation/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: meditationType,
        meditationId: meditationId
      }),
    });

    console.log('Image response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Image error response:', errorData);
      if (response.status === 429) {
        throw new Error(errorData.error || 'הגעת למגבלת התמונות 🖼️');
      }
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const result = await response.json();
    console.log('Image result:', result);
    console.log('Image generated successfully');

    // Convert base64 to data URL
    const imageDataUrl = `data:${result.contentType};base64,${result.image}`;

    // Show image
    meditationImage.src = imageDataUrl;
    imageLoading.style.display = 'none';
    imageContainer.style.display = 'block';

    // Set download link with meaningful Hebrew name
    downloadImageBtn.href = imageDataUrl;
    downloadImageBtn.download = getMeditationFileName(currentMeditationType, 'jpg');

  } catch (error) {
    console.error('Error generating image:', error);
    imageLoading.innerHTML = `
      <p style="color: #EF4444;">❌ לא הצלחנו ליצור את התמונה</p>
      <p style="font-size: 0.9rem; color: #9CA3AF;">נסי שוב בעוד כמה רגעים</p>
      <button class="btn btn-secondary" onclick="generateImage('${meditationId}', '${meditationType}')">נסי שוב</button>
    `;
  }
}

// ============================================
// Share to WhatsApp
// ============================================

shareWhatsAppBtn.addEventListener('click', async () => {
  // Check if audio is ready
  const audioDataUrl = audioSource.src;
  if (!audioDataUrl || audioDataUrl === '') {
    alert('⏳ האודיו עדיין לא מוכן. המתיני שההקלטה תסתיים.');
    return;
  }

  const fileName = getMeditationFileName(currentMeditationType, 'mp3');
  const typeName = typeNames[currentMeditationType] || 'מדיטציה';

  // Try Web Share API (works on mobile!)
  if (navigator.share && navigator.canShare) {
    try {
      // Convert base64 to blob
      const base64 = audioDataUrl.split(',')[1];
      const byteChars = atob(base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const file = new File([blob], fileName, { type: 'audio/mpeg' });

      const shareData = {
        title: `🧘 מדיטציית ${typeName}`,
        text: `🧘 מדיטציית ${typeName}\nנוצר באפליקציית המדיטציות של שולמית ✨`,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled
      console.log('Share API failed, falling back:', err);
    }
  }

  // Fallback: share text via WhatsApp + download file
  const shareText = encodeURIComponent(`🧘 מדיטציית ${typeName}\nנוצר עם מחולל המדיטציות האישי ✨`);
  window.open(`https://wa.me/?text=${shareText}`, '_blank');

  // Also download the audio
  downloadAudioBtn.click();
});

// ============================================
// Create Another Meditation
// ============================================

createAnotherBtn.addEventListener('click', () => {
  // Hide results
  resultsSection.style.display = 'none';

  // Show form
  formSection.style.display = 'block';

  // Re-enable create button
  createBtn.disabled = false;
  createBtn.innerHTML = `
    <span class="btn-text">צור מדיטציה</span>
    <span class="btn-icon">✨</span>
  `;

  // Scroll to form
  formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ============================================
// Auto-play audio when loaded (optional)
// ============================================

audio.addEventListener('loadeddata', () => {
  console.log('Audio loaded and ready to play');
  // Uncomment to auto-play:
  // audio.play().catch(err => console.log('Auto-play prevented:', err));
});

// ============================================
// Initialize
// ============================================

// ============================================
// Login / Password Protection
// ============================================

const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

function checkAuth() {
  // Password protection disabled - to re-enable, remove the next line and uncomment the block below
  loginScreen.classList.add('hidden');
  /*
  if (localStorage.getItem('meditation_auth') === 'true') {
    loginScreen.classList.add('hidden');
  } else {
    loginScreen.classList.remove('hidden');
    passwordInput.focus();
  }
  */
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';

  const password = passwordInput.value.trim();
  if (!password) return;

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      localStorage.setItem('meditation_auth', 'true');
      loginScreen.classList.add('hidden');
    } else {
      loginError.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    // Fallback: client-side check if API is down
    loginError.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();
  }
});

checkAuth();

console.log('🧘 Meditation Web App initialized');
console.log('Ready to create beautiful meditations!');
