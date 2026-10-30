
import { useState, useRef, useEffect } from 'react'
import HomePage from './HomePage'
import MenuPage from './MenuPage'

function App() {
  const [showMenu, setShowMenu] = useState(false)
  const clickSound = useRef(null)

  useEffect(() => {
    clickSound.current = new Audio(
  `${import.meta.env.BASE_URL}sound/click.mp3`
)
    clickSound.current.preload = 'auto'
  }, [])

  function handleClick(event) {
    const target = event.target
    console.log('click detected!')

    // فقط برای عناصر تعاملی صدا پخش شود
    const clickable = target.closest(
      'button, a, [role="button"], input[type="checkbox"], input[type="radio"]'
    )

    if (!clickable || clickable.disabled) return

    if (clickSound.current) {
      clickSound.current.currentTime = 0
      clickSound.current.play().catch(() => {})
    }
  }

  return (
    <div onClick={handleClick}>
      {showMenu ? (
        <MenuPage />
      ) : (
        <HomePage onEnterMenu={() => setShowMenu(true)} />
      )}
    </div>
  )
}

export default App
