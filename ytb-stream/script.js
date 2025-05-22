document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const apiBaseUrl = window.location.origin;
  const serverStatusText = document.getElementById('server-status-text');
  const connectionIndicator = document.getElementById('connection-indicator');
  const uptimeElement = document.getElementById('uptime');
  const activeStreamsCount = document.getElementById('active-streams-count');
  const cpuLoadBar = document.getElementById('cpu-load-bar').querySelector('.progress-fill');
  const cpuLoadValue = document.getElementById('cpu-load-value');
  const memoryBar = document.getElementById('memory-bar').querySelector('.progress-fill');
  const memoryValue = document.getElementById('memory-value');
  const logOutput = document.getElementById('log-output');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const emergencyStopBtn = document.getElementById('emergency-stop');
  const streamKeyInput = document.getElementById('stream-key');
  const videoFileSelect = document.getElementById('video-file');
  const streamProfileSelect = document.getElementById('stream-profile');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
  const refreshProfilesBtn = document.getElementById('refresh-profiles');
  const addProfileBtn = document.getElementById('add-profile-btn');
  const profileSearch = document.getElementById('profile-search');
  const profilesTable = document.getElementById('profiles-table');
  const clearLogsBtn = document.getElementById('clear-logs');
  const exportLogsBtn = document.getElementById('export-logs');
  const profileModal = document.getElementById('profile-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const profileForm = document.getElementById('profile-form');
  const modalProfileName = document.getElementById('modal-profile-name');
  const modalStreamKey = document.getElementById('modal-stream-key');
  const modalVideoPath = document.getElementById('modal-video-path');
  const modalBitrate = document.getElementById('modal-bitrate');
  const bitrateValue = document.getElementById('bitrate-value');
  const cancelProfileBtn = document.getElementById('cancel-profile');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Charts
  const cpuCtx = document.getElementById('cpu-usage-graph').getContext('2d');
  const memoryCtx = document.getElementById('memory-usage-graph').getContext('2d');
  
  let cpuChart, memoryChart;
  let systemStats = [];
  let logs = [];
  let streamProfiles = [];
  let isKeyVisible = false;

  // Initialize the application
  initCharts();
  loadStreamProfiles();
  checkServerStatus();
  setInterval(checkServerStatus, 5000);
  setInterval(updateSystemStats, 10000);

  // Event Listeners
  startBtn.addEventListener('click', startStream);
  stopBtn.addEventListener('click', stopStream);
  emergencyStopBtn.addEventListener('click', emergencyStop);
  toggleKeyVisibilityBtn.addEventListener('click', toggleKeyVisibility);
  refreshProfilesBtn.addEventListener('click', loadStreamProfiles);
  addProfileBtn.addEventListener('click', () => profileModal.classList.add('active'));
  closeModalBtn.addEventListener('click', () => profileModal.classList.remove('active'));
  cancelProfileBtn.addEventListener('click', () => profileModal.classList.remove('active'));
  clearLogsBtn.addEventListener('click', clearLogs);
  exportLogsBtn.addEventListener('click', exportLogs);
  profileSearch.addEventListener('input', filterProfiles);
  modalBitrate.addEventListener('input', updateBitrateValue);
  profileForm.addEventListener('submit', saveProfile);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Functions
  function initCharts() {
    cpuChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels: Array(12).fill(''),
        datasets: [{
          label: 'CPU Usage %',
          data: Array(12).fill(0),
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    memoryChart = new Chart(memoryCtx, {
      type: 'line',
      data: {
        labels: Array(12).fill(''),
        datasets: [{
          label: 'Memory Usage %',
          data: Array(12).fill(0),
          borderColor: '#4cc9f0',
          backgroundColor: 'rgba(76, 201, 240, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  function updateSystemStats() {
    fetch(`${apiBaseUrl}/api/system-stats`)
      .then(response => response.json())
      .then(data => {
        systemStats.push(data);
        if (systemStats.length > 12) systemStats.shift();
        
        // Update CPU
        cpuLoadBar.style.width = `${data.cpu}%`;
        cpuLoadValue.textContent = `${data.cpu}%`;
        
        // Update Memory
        memoryBar.style.width = `${data.memory}%`;
        memoryValue.textContent = `${data.memory}%`;
        
        // Update Charts
        updateCharts();
      })
      .catch(error => {
        logMessage(`Failed to get system stats: ${error.message}`, 'error');
      });
  }

  function updateCharts() {
    const cpuData = systemStats.map(stat => stat.cpu);
    const memoryData = systemStats.map(stat => stat.memory);
    
    cpuChart.data.datasets[0].data = cpuData;
    memoryChart.data.datasets[0].data = memoryData;
    
    cpuChart.update();
    memoryChart.update();
  }

  function checkServerStatus() {
    fetch(`${apiBaseUrl}/api/status`)
      .then(response => response.json())
      .then(data => {
        connectionIndicator.className = 'status-dot connected';
        serverStatusText.textContent = 'Connected';
        
        // Update uptime
        uptimeElement.textContent = formatUptime(data.uptime);
        
        // Update active streams
        activeStreamsCount.textContent = data.activeStreams.length;
        
        // Update UI based on streaming status
        if (data.activeStreams.length > 0) {
          startBtn.disabled = true;
          stopBtn.disabled = false;
        } else {
          startBtn.disabled = false;
          stopBtn.disabled = true;
        }
      })
      .catch(error => {
        connectionIndicator.className = 'status-dot disconnected';
        serverStatusText.textContent = 'Disconnected';
        logMessage(`Server connection error: ${error.message}`, 'error');
      });
  }

  function loadStreamProfiles() {
    fetch(`${apiBaseUrl}/api/profiles`)
      .then(response => response.json())
      .then(profiles => {
        streamProfiles = profiles;
        renderProfilesTable();
        updateProfileSelect();
      })
      .catch(error => {
        logMessage(`Failed to load stream profiles: ${error.message}`, 'error');
      });
  }

  function renderProfilesTable() {
    if (streamProfiles.length === 0) {
      profilesTable.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">No profiles found. Create your first profile.</td>
        </tr>
      `;
      return;
    }

    profilesTable.innerHTML = streamProfiles.map(profile => `
      <tr>
        <td>${profile.name}</td>
        <td class="stream-key-cell">${'•'.repeat(12)}</td>
        <td>${profile.videoPath}</td>
        <td>${profile.lastUsed || 'Never'}</td>
        <td class="actions-cell">
          <button class="icon-btn use-profile" data-id="${profile.id}" title="Use Profile">
            <i class="fas fa-play"></i>
          </button>
          <button class="icon-btn edit-profile" data-id="${profile.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-btn delete-profile" data-id="${profile.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Add event listeners to new buttons
    document.querySelectorAll('.use-profile').forEach(btn => {
      btn.addEventListener('click', () => useProfile(btn.dataset.id));
    });
    
    document.querySelectorAll('.edit-profile').forEach(btn => {
      btn.addEventListener('click', () => editProfile(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-profile').forEach(btn => {
      btn.addEventListener('click', () => deleteProfile(btn.dataset.id));
    });
  }

  function updateProfileSelect() {
    streamProfileSelect.innerHTML = `
      <option value="">Select a profile...</option>
      ${streamProfiles.map(profile => `
        <option value="${profile.id}">${profile.name}</option>
      `).join('')}
    `;
  }

  function filterProfiles() {
    const searchTerm = profileSearch.value.toLowerCase();
    const rows = profilesTable.querySelectorAll('tr:not(.empty-row)');
    
    rows.forEach(row => {
      const name = row.cells[0].textContent.toLowerCase();
      row.style.display = name.includes(searchTerm) ? '' : 'none';
    });
  }

  function useProfile(profileId) {
    const profile = streamProfiles.find(p => p.id === profileId);
    if (profile) {
      streamKeyInput.value = profile.streamKey;
      videoFileSelect.value = profile.videoPath;
      logMessage(`Loaded profile: ${profile.name}`, 'info');
    }
  }

  function editProfile(profileId) {
    const profile = streamProfiles.find(p => p.id === profileId);
    if (profile) {
      modalProfileName.value = profile.name;
      modalStreamKey.value = profile.streamKey;
      modalVideoPath.value = profile.videoPath;
      profileModal.classList.add('active');
      // TODO: Implement edit functionality
    }
  }

  function deleteProfile(profileId) {
    if (confirm('Are you sure you want to delete this profile?')) {
      fetch(`${apiBaseUrl}/api/profiles/${profileId}`, {
        method: 'DELETE'
      })
      .then(() => {
        loadStreamProfiles();
        logMessage('Profile deleted successfully', 'info');
      })
      .catch(error => {
        logMessage(`Failed to delete profile: ${error.message}`, 'error');
      });
    }
  }

  function saveProfile(e) {
    e.preventDefault();
    
    const profile = {
      name: modalProfileName.value,
      streamKey: modalStreamKey.value,
      videoPath: modalVideoPath.value,
      bitrate: modalBitrate.value
    };
    
    fetch(`${apiBaseUrl}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profile)
    })
    .then(() => {
      loadStreamProfiles();
      profileModal.classList.remove('active');
      profileForm.reset();
      logMessage('Profile saved successfully', 'info');
    })
    .catch(error => {
      logMessage(`Failed to save profile: ${error.message}`, 'error');
    });
  }

  function startStream() {
    const streamKey = streamKeyInput.value.trim();
    const videoFile = videoFileSelect.value;
    
    if (!streamKey || !videoFile) {
      logMessage('Please enter a stream key and select a video file', 'error');
      return;
    }
    
    logMessage('Starting stream...', 'info');
    
    fetch(`${apiBaseUrl}/api/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        streamKey,
        videoFile
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        logMessage(data.error, 'error');
      } else {
        logMessage('Stream started successfully', 'info');
        checkServerStatus();
      }
    })
    .catch(error => {
      logMessage(`Failed to start stream: ${error.message}`, 'error');
    });
  }

  function stopStream() {
    logMessage('Stopping stream...', 'info');
    
    fetch(`${apiBaseUrl}/api/stop`, {
      method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        logMessage(data.error, 'error');
      } else {
        logMessage('Stream stopped successfully', 'info');
        checkServerStatus();
      }
    })
    .catch(error => {
      logMessage(`Failed to stop stream: ${error.message}`, 'error');
    });
  }

  function emergencyStop() {
    if (confirm('This will immediately terminate all active streams. Continue?')) {
      logMessage('Emergency stop initiated!', 'warning');
      
      fetch(`${apiBaseUrl}/api/emergency-stop`, {
        method: 'POST'
      })
      .then(response => response.json())
      .then(data => {
        logMessage('All streams have been terminated', 'warning');
        checkServerStatus();
      })
      .catch(error => {
        logMessage(`Emergency stop failed: ${error.message}`, 'error');
      });
    }
  }

  function toggleKeyVisibility() {
    isKeyVisible = !isKeyVisible;
    streamKeyInput.type = isKeyVisible ? 'text' : 'password';
    toggleKeyVisibilityBtn.innerHTML = isKeyVisible ? 
      '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  }

  function updateBitrateValue() {
    bitrateValue.textContent = modalBitrate.value;
  }

  function logMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-message">${message}</span>
    `;
    logOutput.prepend(logEntry);
    logs.unshift({ timestamp, message, type });
    
    // Auto-scroll to top
    logOutput.scrollTop = 0;
  }

  function clearLogs() {
    logOutput.innerHTML = '';
    logs = [];
  }

  function exportLogs() {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function switchTab(tabId) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Initialize video file select
  fetch(`${apiBaseUrl}/api/videos`)
    .then(response => response.json())
    .then(videos => {
      videoFileSelect.innerHTML = `
        <option value="">Select a video file...</option>
        ${videos.map(video => `
          <option value="${video}">${video}</option>
        `).join('')}
      `;
      
      modalVideoPath.innerHTML = videoFileSelect.innerHTML;
    })
    .catch(error => {
      logMessage(`Failed to load video files: ${error.message}`, 'error');
    });
});