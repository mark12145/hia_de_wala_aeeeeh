// Room Price Updater - Include this in room pages to get updated prices
class RoomPriceUpdater {
  constructor(roomType) {
    this.roomType = roomType;
    this.lastUpdateVersion = 0;
    this.init();
  }

  init() {
    this.updatePricesOnPage();
    this.setupRealTimeUpdates();
  }

  setupRealTimeUpdates() {
    // Listen for storage changes (when admin updates prices)
    window.addEventListener('storage', (e) => {
      if (e.key === `${this.roomType}RoomPrices` || 
          e.key === 'roomPrices' || 
          e.key === 'priceUpdateBroadcast' ||
          e.key === `${this.roomType}_prices_v2`) {
        this.handlePriceUpdate(e);
      }
    });

    // Listen for BroadcastChannel updates (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('methods-price-updates');
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'PRICE_UPDATE' && event.data.roomType === this.roomType) {
          this.updatePricesFromData(event.data.prices);
          this.showUpdateNotification(event.data.adminUser);
        }
      });
    }
    
    // Periodic check for updates (fallback)
    setInterval(() => {
      this.checkForUpdates();
    }, 30000); // Check every 30 seconds
  }

  handlePriceUpdate(storageEvent) {
    if (storageEvent.key === 'priceUpdateBroadcast') {
      try {
        const updateData = JSON.parse(storageEvent.newValue);
        if (updateData.roomType === this.roomType) {
          this.updatePricesFromData(updateData.prices);
          this.showUpdateNotification(updateData.adminUser);
        }
      } catch (error) {
        console.error('Error parsing price update broadcast:', error);
      }
    } else {
      this.updatePricesOnPage();
    }
  }

  checkForUpdates() {
    try {
      const roomPriceData = localStorage.getItem(`${this.roomType}RoomPrices`);
      if (roomPriceData) {
        const data = JSON.parse(roomPriceData);
        if (data.version && data.version > this.lastUpdateVersion) {
          this.lastUpdateVersion = data.version;
          this.updatePricesFromData(data);
        }
      }
    } catch (error) {
      console.error('Error checking for price updates:', error);
    }
  }

  updatePricesOnPage() {
    try {
      // Get updated prices from multiple sources for redundancy
      let roomPriceData = localStorage.getItem(`${this.roomType}RoomPrices`) ||
                         localStorage.getItem(`${this.roomType}_prices_v2`);
      const generalPriceData = localStorage.getItem('roomPrices');
      
      let prices = null;
      
      if (roomPriceData) {
        const data = JSON.parse(roomPriceData);
        prices = data;
        if (data.version) {
          this.lastUpdateVersion = data.version;
        }
      } else if (generalPriceData) {
        const allPrices = JSON.parse(generalPriceData);
        prices = allPrices[this.roomType];
      }

      if (prices) {
        this.updatePricesFromData(prices);
      }
    } catch (error) {
      console.error('Error updating room prices:', error);
    }
  }

  updatePricesFromData(prices) {
    if (prices.morning) {
      this.updateMorningPrices(prices.morning);
    }
    if (prices.evening) {
      this.updateEveningPrices(prices.evening);
    }
    if (prices.morning && prices.morning.hourly) {
      this.updateMainPrice(prices.morning.hourly);
    }
  }

  updateMorningPrices(morningPrices) {
    // Update morning rates display with animation
    const morningContent = document.getElementById('morning');
    if (morningContent && morningPrices) {
      const ratesDiv = morningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.style.opacity = '0.5';
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${morningPrices.hourly}</div>
          <div>Daily: EGP ${morningPrices.daily}</div>
          <div>Monthly: EGP ${morningPrices.monthly}</div>
        `;
        setTimeout(() => {
          ratesDiv.style.opacity = '1';
        }, 200);
      }
    }
  }

  updateEveningPrices(eveningPrices) {
    // Update evening rates display with animation
    const eveningContent = document.getElementById('evening');
    if (eveningContent && eveningPrices) {
      const ratesDiv = eveningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.style.opacity = '0.5';
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${eveningPrices.hourly}</div>
          <div>Daily: EGP ${eveningPrices.daily}</div>
          <div>Monthly: EGP ${eveningPrices.monthly}</div>
        `;
        setTimeout(() => {
          ratesDiv.style.opacity = '1';
        }, 200);
      }
    }
  }

  updateMainPrice(hourlyPrice) {
    // Update the main price display with animation
    const priceElement = document.querySelector('.price');
    if (priceElement && hourlyPrice) {
      priceElement.style.transform = 'scale(0.95)';
      priceElement.textContent = `EGP ${hourlyPrice} / hour`;
      setTimeout(() => {
        priceElement.style.transform = 'scale(1)';
      }, 200);
    }
  }

  showUpdateNotification(adminUser) {
    // Show a subtle notification that prices were updated
    const notification = document.createElement('div');
    notification.className = 'price-update-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span>💰 Prices updated by ${adminUser}</span>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .price-update-notification .notification-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  
  .price-update-notification button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .rates {
    transition: opacity 0.3s ease;
  }
  
  .price {
    transition: transform 0.3s ease;
  }
`;
document.head.appendChild(style);

// Auto-initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  // Detect room type from page URL or content
  const currentPage = window.location.pathname;
  let roomType = null;

  if (currentPage.includes('room_one') || document.querySelector('h1')?.textContent.includes('Training Hall')) {
    roomType = 'training';
  } else if (currentPage.includes('room_two') || document.querySelector('h1')?.textContent.includes('Private')) {
    roomType = 'private';
  } else if (currentPage.includes('room_three') || document.querySelector('h1')?.textContent.includes('Meeting')) {
    roomType = 'meeting';
  }

  if (roomType) {
    new RoomPriceUpdater(roomType);
  }
});