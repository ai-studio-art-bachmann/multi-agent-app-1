// Store update preferences in local storage
const UPDATE_PREFERENCES_KEY = 'app_update_preferences';
const LAST_UPDATE_CHECK_KEY = 'app_last_update_check';

// Get update preferences from local storage
const getUpdatePreferences = () => {
  try {
    const preferences = localStorage.getItem(UPDATE_PREFERENCES_KEY);
    return preferences ? JSON.parse(preferences) : { autoUpdate: false, lastDecision: null };
  } catch (error) {
    console.error('Error reading update preferences:', error);
    return { autoUpdate: false, lastDecision: null };
  }
};

// Save update preferences to local storage
const saveUpdatePreferences = (preferences) => {
  try {
    localStorage.setItem(UPDATE_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving update preferences:', error);
  }
};

// Check if we should show update notification based on time since last check
const shouldShowUpdateNotification = () => {
  try {
    const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK_KEY);
    if (!lastCheck) return true;
    
    // Only show update notification once per day if user previously declined
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const lastCheckTime = parseInt(lastCheck, 10);
    return Date.now() - lastCheckTime > oneDayInMs;
  } catch (error) {
    console.error('Error checking last update time:', error);
    return true;
  }
};

// Update the last check time
const updateLastCheckTime = () => {
  try {
    localStorage.setItem(LAST_UPDATE_CHECK_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error updating last check time:', error);
  }
};

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Register the service worker with a cache-busting query parameter
      const swUrl = `/sw.js?v=${new Date().getTime()}`;
      
      // Unregister any existing service workers first to ensure clean state
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // We only unregister if the script URL is different from the current one,
        // to avoid unregistering the service worker we're about to use.
        if (registration.active && !registration.active.scriptURL.includes('?v=')) {
          await registration.unregister();
          console.log('Unregistered an old service worker without versioning.');
        }
      }
      
      // Register the new service worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });
      console.log('Service Worker registered successfully:', registration);
      
      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('Received SW_UPDATED message from service worker');
        }
      });
      
      // Set up update handling
      setupUpdateHandling(registration);
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Handle service worker updates
const setupUpdateHandling = (registration) => {
  // Handle updates for new service workers that appear after page load
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    console.log('New service worker found:', newWorker?.state);
    
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        console.log('Service worker state changed:', newWorker.state);
        
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // A new version is available, show an update notification.
          showUpdateNotification(newWorker);
        }
      });
    }
  });
  
  // Handle the case where a service worker is already waiting when the page loads
  if (registration.waiting && navigator.serviceWorker.controller) {
    console.log('Service worker already waiting on page load');
    showUpdateNotification(registration.waiting);
  }
};

// Simplified update notification
const showUpdateNotification = (worker: ServiceWorker) => {
  console.log('A new version of the app is available. Please update.');
  
  const notificationId = 'update-notification-container';
  if (document.getElementById(notificationId)) {
    // Notification is already visible
    return;
  }

  const container = document.createElement('div');
  container.id = notificationId;
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.padding = '1rem';
  container.style.backgroundColor = '#2c3e50';
  container.style.color = 'white';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  container.style.zIndex = '10000';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '1rem';

  container.innerHTML = `<p style="margin: 0; font-size: 0.9rem;">Uusi versio saatavilla!</p>`;

  const updateButton = document.createElement('button');
  updateButton.textContent = 'Päivitä Nyt';
  updateButton.style.padding = '0.5rem 1rem';
  updateButton.style.border = 'none';
  updateButton.style.backgroundColor = '#3498db';
  updateButton.style.color = 'white';
  updateButton.style.borderRadius = '5px';
  updateButton.style.cursor = 'pointer';

  updateButton.onclick = () => {
    applyUpdate(worker);
    container.remove();
  };

  container.appendChild(updateButton);
  document.body.appendChild(container);
};

// Type declaration to ensure TypeScript recognizes window properties
declare global {
  interface Window {
    caches: CacheStorage;
  }
}

// Apply the update by sending SKIP_WAITING to the service worker
const applyUpdate = (worker: ServiceWorker) => {
  console.log('Applying update by sending SKIP_WAITING...');
  
  // When the new service worker takes control, the page will reload.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Controller changed. Reloading page...');
    window.location.reload();
  });
  
  // Send the message to the new service worker to take over.
  worker.postMessage({ type: 'SKIP_WAITING' });
};

export const showInstallPrompt = () => {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to the install prompt: ${outcome}`);
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
  });
};

export const checkOnlineStatus = () => {
  const updateOnlineStatus = () => {
    const status = navigator.onLine ? 'online' : 'offline';
    console.log('Connection status:', status);
    
    // Show/hide offline indicator
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.style.display = navigator.onLine ? 'none' : 'block';
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check
  updateOnlineStatus();
};
