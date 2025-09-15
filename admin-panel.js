// Admin Panel Management System
class AdminPanel {
  constructor() {
    this.priceData = this.loadPriceData();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCurrentPrices();
    this.displayWelcomeMessage();
  }

  setupEventListeners() {
    // Individual room update buttons
    document.querySelectorAll('.btn-update').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roomType = e.target.getAttribute('data-room');
        this.updateRoomPrices(roomType);
      });
    });

    // Bulk actions
    document.getElementById('save-all-btn').addEventListener('click', () => {
      this.saveAllChanges();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Auto-save on input change (debounced)
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', this.debounce(() => {
        this.autoSave();
      }, 2000));
    });
  }

  loadPriceData() {
    // Load existing price data from localStorage or use defaults
    const savedData = localStorage.getItem('roomPrices');
    if (savedData) {
      return JSON.parse(savedData);
    }

    // Default price structure
    return {
      training: {
        morning: { hourly: 100, daily: 800, monthly: 18000 },
        evening: { hourly: 120, daily: 900, monthly: 20000 }
      },
      private: {
        morning: { hourly: 80, daily: 600, monthly: 15000 },
        evening: { hourly: 100, daily: 750, monthly: 18000 }
      },
      meeting: {
        morning: { hourly: 150, daily: 1200, monthly: 25000 },
        evening: { hourly: 180, daily: 1400, monthly: 30000 }
      }
    };
  }

  loadCurrentPrices() {
    // Populate form fields with current prices
    Object.keys(this.priceData).forEach(roomType => {
      Object.keys(this.priceData[roomType]).forEach(timeSlot => {
        Object.keys(this.priceData[roomType][timeSlot]).forEach(duration => {
          const inputId = `${roomType}-${timeSlot}-${duration}`;
          const input = document.getElementById(inputId);
          if (input) {
            input.value = this.priceData[roomType][timeSlot][duration];
          }
        });
      });
    });
  }

  updateRoomPrices(roomType) {
    const btn = document.querySelector(`[data-room="${roomType}"]`);
    btn.classList.add('loading');
    btn.textContent = 'Updating...';

    // Enhanced update with immediate propagation
    setTimeout(() => {
      try {
        // Collect all prices for this room
        const roomPrices = {
          morning: {
            hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
          }
        };

        // Validate prices
        if (this.validatePrices(roomPrices)) {
          // Update local data
          this.priceData[roomType] = roomPrices;
          
          // Save to localStorage
          this.savePriceData();
          
          // Immediately broadcast changes to all open tabs/windows
          this.broadcastPriceUpdate(roomType, roomPrices);
          
          // Update actual room pages
          this.updateRoomPages(roomType, roomPrices);
          
          this.showSuccess(`${this.getRoomDisplayName(roomType)} prices updated successfully!`);
        } else {
          throw new Error('Invalid price values');
        }
      } catch (error) {
        this.showError('Failed to update prices. Please check your values.');
        console.error('Price update error:', error);
      } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Update Prices';
      }
    }, 1500);
  }

  broadcastPriceUpdate(roomType, roomPrices) {
    // Broadcast to all open tabs/windows for immediate updates
    const updateData = {
      type: 'PRICE_UPDATE',
      roomType: roomType,
      prices: roomPrices,
      timestamp: Date.now(),
      adminUser: this.getAdminUsername()
    };
    
    // Use localStorage event to communicate between tabs
    localStorage.setItem('priceUpdateBroadcast', JSON.stringify(updateData));
    
    // Use BroadcastChannel for modern browsers
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('methods-price-updates');
      channel.postMessage(updateData);
    }
  }

  saveAllChanges() {
    const saveBtn = document.getElementById('save-all-btn');
    saveBtn.classList.add('loading');
    saveBtn.textContent = 'Saving...';

    setTimeout(() => {
      try {
        // Collect all current form values
        Object.keys(this.priceData).forEach(roomType => {
          const roomPrices = {
            morning: {
              hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
              daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
              monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
            },
            evening: {
              hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
              daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
              monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
            }
          };

          if (this.validatePrices(roomPrices)) {
            this.priceData[roomType] = roomPrices;
            this.updateRoomPages(roomType, roomPrices);
            this.broadcastPriceUpdate(roomType, roomPrices);
          }
        });

        this.savePriceData();
        this.showSuccess('All room prices updated successfully!');
      } catch (error) {
        this.showError('Failed to save all changes.');
        console.error('Bulk save error:', error);
      } finally {
        saveBtn.classList.remove('loading');
        saveBtn.textContent = 'Save All Changes';
      }
    }, 2000);
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all prices to default values? This action cannot be undone.')) {
      // Reset to default prices
      this.priceData = {
        training: {
          morning: { hourly: 100, daily: 800, monthly: 18000 },
          evening: { hourly: 120, daily: 900, monthly: 20000 }
        },
        private: {
          morning: { hourly: 80, daily: 600, monthly: 15000 },
          evening: { hourly: 100, daily: 750, monthly: 18000 }
        },
        meeting: {
          morning: { hourly: 150, daily: 1200, monthly: 25000 },
          evening: { hourly: 180, daily: 1400, monthly: 30000 }
        }
      };

      this.loadCurrentPrices();
      this.savePriceData();
      
      // Update all room pages
      Object.keys(this.priceData).forEach(roomType => {
        this.updateRoomPages(roomType, this.priceData[roomType]);
        this.broadcastPriceUpdate(roomType, this.priceData[roomType]);
      });

      this.showSuccess('All prices reset to default values!');
    }
  }

  validatePrices(roomPrices) {
    // Validate that all prices are positive numbers
    for (const timeSlot of Object.keys(roomPrices)) {
      for (const duration of Object.keys(roomPrices[timeSlot])) {
        const price = roomPrices[timeSlot][duration];
        if (isNaN(price) || price < 0) {
          return false;
        }
      }
    }
    return true;
  }

  updateRoomPages(roomType, roomPrices) {
    // This would typically make API calls to update the actual room pages
    // For this demo, we'll store the data and it can be retrieved by the room pages
    const timestamp = new Date().toISOString();
    const adminUser = this.getAdminUsername();
    
    const roomPageData = {
      ...roomPrices,
      lastUpdated: timestamp,
      updatedBy: adminUser,
      version: Date.now() // Version for cache busting
    };

    // Store with multiple keys for redundancy
    localStorage.setItem(`${roomType}RoomPrices`, JSON.stringify(roomPageData));
    localStorage.setItem(`${roomType}_prices_v2`, JSON.stringify(roomPageData));
    localStorage.setItem('lastPriceUpdate', timestamp);
  }

  savePriceData() {
    localStorage.setItem('roomPrices', JSON.stringify(this.priceData));
  }

  autoSave() {
    // Auto-save functionality (silent save)
    try {
      Object.keys(this.priceData).forEach(roomType => {
        const roomPrices = {
          morning: {
            hourly: parseInt(document.getElementById(`${roomType}-morning-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-morning-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-morning-monthly`).value) || 0
          },
          evening: {
            hourly: parseInt(document.getElementById(`${roomType}-evening-hourly`).value) || 0,
            daily: parseInt(document.getElementById(`${roomType}-evening-daily`).value) || 0,
            monthly: parseInt(document.getElementById(`${roomType}-evening-monthly`).value) || 0
          }
        };

        if (this.validatePrices(roomPrices)) {
          this.priceData[roomType] = roomPrices;
        }
      });

      this.savePriceData();
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  displayWelcomeMessage() {
    const welcomeElement = document.getElementById('admin-welcome');
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
    if (welcomeElement && sessionData.username) {
      welcomeElement.textContent = `Welcome, ${sessionData.username}`;
    }
  }

  getAdminUsername() {
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
    return sessionData.username || 'Admin';
  }

  getRoomDisplayName(roomType) {
    const names = {
      training: 'Training Hall',
      private: 'Private Room',
      meeting: 'Meeting Room'
    };
    return names[roomType] || roomType;
  }

  showSuccess(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 5000);
    }
  }

  showError(message) {
    alert(message); // Simple error display - could be enhanced with better UI
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
  new AdminPanel();
});