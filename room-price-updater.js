// Room Price Updater - Include this in room pages to get updated prices
class RoomPriceUpdater {
  constructor(roomType) {
    this.roomType = roomType;
    this.init();
  }

  init() {
    this.updatePricesOnPage();
    
    // Listen for storage changes (when admin updates prices)
    window.addEventListener('storage', (e) => {
      if (e.key === `${this.roomType}RoomPrices` || e.key === 'roomPrices') {
        this.updatePricesOnPage();
      }
    });
  }

  updatePricesOnPage() {
    try {
      // Get updated prices from localStorage
      const roomPriceData = localStorage.getItem(`${this.roomType}RoomPrices`);
      const generalPriceData = localStorage.getItem('roomPrices');
      
      let prices = null;
      
      if (roomPriceData) {
        prices = JSON.parse(roomPriceData);
      } else if (generalPriceData) {
        const allPrices = JSON.parse(generalPriceData);
        prices = allPrices[this.roomType];
      }

      if (prices) {
        this.updateMorningPrices(prices.morning);
        this.updateEveningPrices(prices.evening);
        this.updateMainPrice(prices.morning.hourly); // Update main display price
      }
    } catch (error) {
      console.error('Error updating room prices:', error);
    }
  }

  updateMorningPrices(morningPrices) {
    // Update morning rates display
    const morningContent = document.getElementById('morning');
    if (morningContent && morningPrices) {
      const ratesDiv = morningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${morningPrices.hourly}</div>
          <div>Daily: EGP ${morningPrices.daily}</div>
          <div>Monthly: EGP ${morningPrices.monthly}</div>
        `;
      }
    }
  }

  updateEveningPrices(eveningPrices) {
    // Update evening rates display
    const eveningContent = document.getElementById('evening');
    if (eveningContent && eveningPrices) {
      const ratesDiv = eveningContent.querySelector('.rates');
      if (ratesDiv) {
        ratesDiv.innerHTML = `
          <div>Hourly: EGP ${eveningPrices.hourly}</div>
          <div>Daily: EGP ${eveningPrices.daily}</div>
          <div>Monthly: EGP ${eveningPrices.monthly}</div>
        `;
      }
    }
  }

  updateMainPrice(hourlyPrice) {
    // Update the main price display
    const priceElement = document.querySelector('.price');
    if (priceElement && hourlyPrice) {
      priceElement.textContent = `EGP ${hourlyPrice} / hour`;
    }
  }
}

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