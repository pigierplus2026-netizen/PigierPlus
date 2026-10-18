import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<App />)
try { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')) } catch (e) {}
// Onde de couleur à chaque clic (désactivée si mouvement réduit)
try {
  if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    document.addEventListener('pointerdown', (e) => {
      if (document.body.classList.contains('eco') || document.querySelectorAll('.onde').length > 2) return
      const o = document.createElement('span'); o.className = 'onde'
      o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px'
      document.body.appendChild(o); setTimeout(() => o.remove(), 650)
    }, { passive: true })
  }
} catch (e) {}
