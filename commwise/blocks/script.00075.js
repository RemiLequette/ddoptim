// Load D3.js from CDN if not already loaded
if (typeof d3 === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
  script.integrity = 'sha512-M7nHCiNUOwFt6Us3r8alutZLm9qMt4s9951uo8jqO4UwJ1hziseL6O3ndFyigx6+LREfZqnhHxYjKRJ8ZQ69DQ==';
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    console.log('D3.js loaded successfully, version:', d3.version);
    // Dispatch event to notify other scripts
    window.dispatchEvent(new Event('d3-loaded'));
  };
  script.onerror = () => {
    console.error('Failed to load D3.js from CDN');
  };
  document.head.appendChild(script);
  console.log('Loading D3.js from CDN...');
} else {
  console.log('D3.js already loaded, version:', d3.version);
}
